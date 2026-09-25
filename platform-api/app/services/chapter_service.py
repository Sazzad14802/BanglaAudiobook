"""
Chapter service: retrieves and manages audiobook chapters,
enforcing audiobook visibility and authorization rules.
"""

from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chapter import Chapter
from app.models.user import User
from app.schemas.chapter import ChapterCreate
from app.services.audiobook_service import get_audiobook_for_user, get_audiobook_raw


async def get_chapters_for_user(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: Optional[User] = None,
) -> list[Chapter]:
    """
    Retrieve all chapters for an audiobook.
    Verifies caller has authorization to view the audiobook first.
    """
    # Enforces visibility/authorization
    await get_audiobook_for_user(db, audiobook_id, user)

    result = await db.execute(
        select(Chapter)
        .where(Chapter.audiobook_id == audiobook_id)
        .order_by(Chapter.chapter_number.asc())
    )
    return list(result.scalars().all())


async def get_chapter_for_user(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    chapter_id: uuid.UUID,
    user: Optional[User] = None,
) -> Chapter:
    """
    Retrieve a specific chapter.
    Verifies caller has authorization to view the audiobook first.
    """
    # Enforces visibility/authorization
    await get_audiobook_for_user(db, audiobook_id, user)

    result = await db.execute(
        select(Chapter).where(
            Chapter.id == chapter_id,
            Chapter.audiobook_id == audiobook_id,
        )
    )
    chapter = result.scalar_one_or_none()
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chapter not found",
        )
    return chapter


async def create_chapter(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    data: ChapterCreate,
    user: Optional[User] = None,
) -> Chapter:
    """
    Create a chapter for an audiobook.
    If user is provided, validates ownership.
    """
    if user:
        audiobook = await get_audiobook_raw(db, audiobook_id)
        if not audiobook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audiobook not found",
            )
        if audiobook.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the audiobook owner can add chapters",
            )

    chapter = Chapter(
        audiobook_id=audiobook_id,
        title=data.title.strip(),
        chapter_number=data.chapter_number,
        duration_seconds=data.duration_seconds,
        audio_url=data.audio_url.strip() if data.audio_url else None,
    )
    db.add(chapter)
    await db.commit()
    await db.refresh(chapter)
    return chapter
