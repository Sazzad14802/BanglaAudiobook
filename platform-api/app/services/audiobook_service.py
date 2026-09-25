"""
Audiobook service: handles creation, retrieval, updates, deletion,
and strict PUBLIC / PRIVATE visibility enforcement.
"""

import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audiobook import Audiobook, AudiobookStatus, AudiobookVisibility
from app.models.user import User
from app.schemas.audiobook import AudiobookCreate, AudiobookUpdate


async def create_audiobook(
    db: AsyncSession,
    user: User,
    data: AudiobookCreate,
) -> Audiobook:
    """Create a new audiobook record owned by the current user."""
    audiobook = Audiobook(
        owner_id=user.id,
        title=data.title.strip(),
        author=data.author.strip() if data.author else None,
        description=data.description.strip() if data.description else None,
        language=data.language.strip().lower(),
        visibility=data.visibility,
        status=AudiobookStatus.PENDING,
    )
    db.add(audiobook)
    await db.commit()
    await db.refresh(audiobook)
    return audiobook


async def get_audiobook_for_user(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: Optional[User] = None,
) -> Audiobook:
    """
    Retrieve an audiobook applying strict authorization and visibility rules:
    - Owner: Full access regardless of visibility or generation status.
    - Other users / Anonymous: Access ONLY if visibility == PUBLIC and status == COMPLETED.
    - If unauthorized or not found: Raises 404 to avoid leaking private resource existence.
    """
    result = await db.execute(
        select(Audiobook).where(Audiobook.id == audiobook_id)
    )
    audiobook = result.scalar_one_or_none()

    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    # If requester is the owner, allow access
    if user and audiobook.owner_id == user.id:
        return audiobook

    # For non-owners: must be strictly PUBLIC and COMPLETED
    if (
        audiobook.visibility == AudiobookVisibility.PUBLIC
        and audiobook.status == AudiobookStatus.COMPLETED
    ):
        return audiobook

    # Otherwise return 404 to prevent information leakage
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Audiobook not found",
    )


async def get_audiobook_raw(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
) -> Optional[Audiobook]:
    """Internal helper to retrieve audiobook without authorization filtering."""
    result = await db.execute(
        select(Audiobook).where(Audiobook.id == audiobook_id)
    )
    return result.scalar_one_or_none()


async def get_public_audiobooks(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    language: Optional[str] = None,
    author: Optional[str] = None,
    status_filter: Optional[AudiobookStatus] = None,
) -> tuple[list[Audiobook], int, int]:
    """
    Public audiobook discovery endpoint.
    Guarantees that PRIVATE audiobooks are NEVER exposed.
    Only audiobooks with visibility == PUBLIC and status == COMPLETED are returned.
    """
    page = max(1, page)
    size = min(max(1, size), 100)

    # Base query: strictly PUBLIC and COMPLETED
    conditions = [
        Audiobook.visibility == AudiobookVisibility.PUBLIC,
        Audiobook.status == AudiobookStatus.COMPLETED,
    ]

    if language:
        conditions.append(Audiobook.language == language.strip().lower())
    if author:
        conditions.append(Audiobook.author.ilike(f"%{author.strip()}%"))
    if status_filter and status_filter == AudiobookStatus.COMPLETED:
        # Note: public discovery only allows COMPLETED books anyway
        conditions.append(Audiobook.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(Audiobook).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Fetch paginated items
    query = (
        select(Audiobook)
        .where(*conditions)
        .order_by(Audiobook.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    pages = math.ceil(total / size) if total > 0 else 1
    return items, total, pages


async def get_user_audiobooks(
    db: AsyncSession,
    user: User,
    page: int = 1,
    size: int = 20,
) -> tuple[list[Audiobook], int, int]:
    """Retrieve all audiobooks created and owned by the authenticated user."""
    page = max(1, page)
    size = min(max(1, size), 100)

    conditions = [Audiobook.owner_id == user.id]

    count_query = select(func.count()).select_from(Audiobook).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = (
        select(Audiobook)
        .where(*conditions)
        .order_by(Audiobook.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    pages = math.ceil(total / size) if total > 0 else 1
    return items, total, pages


async def update_audiobook(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: User,
    data: AudiobookUpdate,
) -> Audiobook:
    """Update audiobook metadata. Only the owner can perform this action."""
    audiobook = await get_audiobook_raw(db, audiobook_id)
    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    if audiobook.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the audiobook owner can update metadata",
        )

    if data.title is not None:
        audiobook.title = data.title.strip()
    if data.author is not None:
        audiobook.author = data.author.strip()
    if data.description is not None:
        audiobook.description = data.description.strip()
    if data.language is not None:
        audiobook.language = data.language.strip().lower()
    if data.cover_image_url is not None:
        audiobook.cover_image_url = data.cover_image_url.strip()

    await db.commit()
    await db.refresh(audiobook)
    return audiobook


async def update_visibility(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: User,
    new_visibility: AudiobookVisibility,
) -> Audiobook:
    """
    Update audiobook visibility (PUBLIC <-> PRIVATE).
    Only the owner can perform this action.
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
            detail="Only the audiobook owner can change its visibility",
        )

    audiobook.visibility = new_visibility
    await db.commit()
    await db.refresh(audiobook)
    return audiobook


async def delete_audiobook(
    db: AsyncSession,
    audiobook_id: uuid.UUID,
    user: User,
) -> bool:
    """Delete an audiobook. Only the owner can perform this action."""
    audiobook = await get_audiobook_raw(db, audiobook_id)
    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    if audiobook.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the audiobook owner can delete it",
        )

    await db.delete(audiobook)
    await db.commit()
    return True
