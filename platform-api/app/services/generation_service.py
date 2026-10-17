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
    await db.execute(select(User).where(User.id == user.id).with_for_update())
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

    from app.models.platform import Quota
    from app.services.policy import configuration, month_now, premium, publishing
    if user.account_type == "admin":
        raise HTTPException(403, "Administrator accounts cannot generate audio")
    if user.account_type == "publisher":
        publishing(user)
    # All submissions for an account serialize on its row in PostgreSQL.
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    existing = await db.scalar(select(GenerationJob).where(
        GenerationJob.audiobook_id == audiobook_id).order_by(GenerationJob.created_at.desc()).limit(1))
    if existing and existing.status in (AudiobookStatus.PENDING, AudiobookStatus.PROCESSING) and not existing.cancelled:
        return existing
    if audiobook.status == AudiobookStatus.COMPLETED:
        raise HTTPException(409, "Create a new audiobook to generate a different version")
    policy = await configuration(db)
    tier = "publisher" if user.account_type == "publisher" else "premium" if premium(user) else "free"
    quota = await db.get(Quota, (user.id, month_now()))
    if not quota:
        quota = Quota(user_id=user.id, month=month_now(), used=0)
        db.add(quota)
    if quota.used >= policy[tier + "_quota"]:
        raise HTTPException(429, "Monthly generation quota reached")
    # Validate before consuming a quota slot.
    from pypdf import PdfReader
    from app.services.storage_service import get_storage_service
    path = await get_storage_service().get_file_path(audiobook.source_file_url)
    try:
        reader = PdfReader(path)
        if reader.is_encrypted or not 0 < len(reader.pages) <= 1000:
            raise ValueError("Encrypted or excessive page count")
    except Exception:
        raise HTTPException(400, "PDF must be readable, unencrypted, and contain 1–1000 pages")
    quota.used += 1
    job = GenerationJob(audiobook_id=audiobook.id, owner_id=user.id,
        status=AudiobookStatus.PENDING, priority={"free": 0, "premium": 1, "publisher": 2}[tier],
        total_pages=len(reader.pages))
    db.add(job)
    audiobook.status = AudiobookStatus.PENDING
    await db.commit()
    await db.refresh(job)

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
