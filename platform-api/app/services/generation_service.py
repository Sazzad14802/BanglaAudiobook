"""
Generation service: coordinates generation job creation, status queries,
and dispatch to the AI Model Runner integration boundary.
"""

from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audiobook import Audiobook, AudiobookStatus
from app.models.generation_job import GenerationJob
from app.models.user import User
from app.services.audiobook_service import get_audiobook_raw
from app.services.generation_dispatcher import get_generation_dispatcher


async def request_audiobook_generation(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: User,
) -> GenerationJob:
    """
    Trigger audiobook generation via the Model Runner boundary.
    Validations:
    - User is the owner of the audiobook.
    - Source document (PDF) has been uploaded.
    - Creates a new GenerationJob in PENDING state.
    - Dispatches job asynchronously without blocking for OCR/TTS completion.
    """
    audiobook = await get_audiobook_raw(db, audiobook_id)
    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    if audiobook.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the audiobook owner can trigger generation",
        )

    if not audiobook.source_file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A source PDF document must be uploaded before requesting generation",
        )

    # Create new generation job (supports retries / multiple attempts)
    job = GenerationJob(
        audiobook_id=audiobook.id,
        status=AudiobookStatus.PENDING,
    )
    db.add(job)

    # Update audiobook status
    audiobook.status = AudiobookStatus.PENDING
    await db.commit()
    await db.refresh(job)

    # Dispatch to Model Runner boundary (asynchronous queue/mock)
    dispatcher = get_generation_dispatcher()
    payload = {
        "job_id": str(job.id),
        "audiobook_id": str(audiobook.id),
        "source_document_url": audiobook.source_file_url,
        "language": audiobook.language,
    }
    await dispatcher.dispatch(payload)

    return job


async def get_audiobook_generation_status(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: User,
) -> tuple[Audiobook, Optional[GenerationJob], list[GenerationJob]]:
    """
    Retrieve generation status and job history for an audiobook.
    Only the owner can check generation status.
    """
    audiobook = await get_audiobook_raw(db, audiobook_id)
    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    if audiobook.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the audiobook owner can check generation status",
        )

    # Fetch all jobs ordered by created_at desc
    result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.audiobook_id == audiobook_id)
        .order_by(GenerationJob.created_at.desc())
    )
    history = list(result.scalars().all())
    latest_job = history[0] if history else None

    return audiobook, latest_job, history
