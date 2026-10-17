"""
Playback Progress service: manages user playback state and bookmarks.
"""

from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audiobook import Audiobook
from app.models.chapter import Chapter
from app.models.playback import PlaybackProgress
from app.models.user import User
from app.services.audiobook_service import get_audiobook_for_user
from app.services.policy import public_conditions


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


async def get_recent_progress(
    db: AsyncSession,
    user: User,
    limit: int = 10,
) -> list[tuple[PlaybackProgress, Audiobook, float]]:
    """
    Recently played audiobooks the user can still access, newest first,
    with overall completion as a 0–100 percentage across all chapters.
    """
    visible = ((Audiobook.owner_id == user.id) & (Audiobook.publication_status != "deleted")) | public_conditions()
    rows = (await db.execute(
        select(PlaybackProgress, Audiobook)
        .join(Audiobook, Audiobook.id == PlaybackProgress.audiobook_id)
        .where(PlaybackProgress.user_id == user.id, visible)
        .order_by(PlaybackProgress.updated_at.desc())
        .limit(limit)
    )).all()

    result = []
    for progress, audiobook in rows:
        chapters = (await db.execute(
            select(Chapter.id, Chapter.duration_seconds)
            .where(Chapter.audiobook_id == audiobook.id)
            .order_by(Chapter.chapter_number)
        )).all()
        total = sum(d for _, d in chapters) or audiobook.duration_seconds or 0
        listened = progress.position_seconds
        for chapter_id, duration in chapters:
            if chapter_id == progress.chapter_id:
                break
            listened += duration
        percent = min(100.0, listened / total * 100) if total else 0.0
        result.append((progress, audiobook, round(percent, 1)))
    return result


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
