"""
Playback Progress service: manages user playback state and bookmarks.
"""

from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chapter import Chapter
from app.models.playback import PlaybackProgress
from app.models.user import User
from app.services.audiobook_service import get_audiobook_for_user


async def get_playback_progress(
    db: AsyncSession,
    user: User,
    audiobook_id: uuid.UUID,
) -> Optional[PlaybackProgress]:
    """
    Retrieve user's playback position for an audiobook.
    Verifies user has access to the audiobook.
    """
    # Enforces visibility / authorization
    await get_audiobook_for_user(db, audiobook_id, user)

    result = await db.execute(
        select(PlaybackProgress).where(
            PlaybackProgress.user_id == user.id,
            PlaybackProgress.audiobook_id == audiobook_id,
        )
    )
    return result.scalar_one_or_none()


async def save_playback_progress(
    db: AsyncSession,
    user: User,
    audiobook_id: uuid.UUID,
    chapter_id: Optional[uuid.UUID],
    position_seconds: float,
) -> PlaybackProgress:
    """
    Upsert user's playback progress for an audiobook.
    Validations:
    - User is authorized to access the audiobook.
    - If chapter_id is provided, chapter belongs to this audiobook.
    """
    # 1. Enforces visibility / authorization
    await get_audiobook_for_user(db, audiobook_id, user)

    # 2. Validate chapter belongs to audiobook if provided
    if chapter_id:
        chapter_res = await db.execute(
            select(Chapter).where(
                Chapter.id == chapter_id,
                Chapter.audiobook_id == audiobook_id,
            )
        )
        if not chapter_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chapter {chapter_id} does not belong to audiobook {audiobook_id}",
            )

    # 3. Check for existing progress record (user_id, audiobook_id is unique)
    result = await db.execute(
        select(PlaybackProgress).where(
            PlaybackProgress.user_id == user.id,
            PlaybackProgress.audiobook_id == audiobook_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress:
        progress.chapter_id = chapter_id
        progress.position_seconds = max(0.0, position_seconds)
    else:
        progress = PlaybackProgress(
            user_id=user.id,
            audiobook_id=audiobook_id,
            chapter_id=chapter_id,
            position_seconds=max(0.0, position_seconds),
        )
        db.add(progress)

    await db.commit()
    await db.refresh(progress)
    return progress
