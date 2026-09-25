"""
Library service: manages user personal saved audiobook collections.
"""

import math
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audiobook import Audiobook, AudiobookStatus, AudiobookVisibility
from app.models.library import LibraryItem
from app.models.user import User
from app.services.audiobook_service import get_audiobook_raw


async def add_to_library(
    db: AsyncSession,
    user: User,
    audiobook_id: uuid.UUID,
) -> LibraryItem:
    """
    Add an audiobook to the user's personal library.
    Rules:
    - Audiobook must exist.
    - If user is not the owner: Audiobook MUST be PUBLIC and COMPLETED.
      (Private audiobooks cannot be added to other users' libraries).
    - Prevents duplicate entries (raises 409 Conflict).
    """
    audiobook = await get_audiobook_raw(db, audiobook_id)
    if not audiobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    # Check authorization to add to library
    is_owner = audiobook.owner_id == user.id
    if not is_owner:
        if (
            audiobook.visibility != AudiobookVisibility.PUBLIC
            or audiobook.status != AudiobookStatus.COMPLETED
        ):
            # Do not leak private audiobook existence
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audiobook not found or is private",
            )

    # Check for existing duplicate entry
    existing = await db.execute(
        select(LibraryItem).where(
            LibraryItem.user_id == user.id,
            LibraryItem.audiobook_id == audiobook_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Audiobook is already in your library",
        )

    item = LibraryItem(
        user_id=user.id,
        audiobook_id=audiobook_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    # Eagerly load audiobook for response serialization
    item.audiobook = audiobook
    return item


async def remove_from_library(
    db: AsyncSession,
    user: User,
    audiobook_id: uuid.UUID,
) -> bool:
    """Remove an audiobook from the user's library."""
    result = await db.execute(
        select(LibraryItem).where(
            LibraryItem.user_id == user.id,
            LibraryItem.audiobook_id == audiobook_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found in your library",
        )

    await db.delete(item)
    await db.commit()
    return True


async def get_user_library(
    db: AsyncSession,
    user: User,
    page: int = 1,
    size: int = 20,
) -> tuple[list[LibraryItem], int, int]:
    """
    Retrieve the current user's library items.
    Never exposes another user's library.
    Filters out items where an audiobook was turned private by its owner
    (unless the current user is the owner).
    """
    page = max(1, page)
    size = min(max(1, size), 100)

    # Join with Audiobook to apply visibility check
    # Owner can see their private books in their library;
    # Non-owners can only see books that are still PUBLIC and COMPLETED
    visible_filter = (
        (Audiobook.owner_id == user.id)
        | (
            (Audiobook.visibility == AudiobookVisibility.PUBLIC)
            & (Audiobook.status == AudiobookStatus.COMPLETED)
        )
    )

    count_query = (
        select(func.count())
        .select_from(LibraryItem)
        .join(Audiobook, LibraryItem.audiobook_id == Audiobook.id)
        .where(LibraryItem.user_id == user.id, visible_filter)
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = (
        select(LibraryItem)
        .join(Audiobook, LibraryItem.audiobook_id == Audiobook.id)
        .where(LibraryItem.user_id == user.id, visible_filter)
        .options(selectinload(LibraryItem.audiobook))
        .order_by(LibraryItem.added_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    pages = math.ceil(total / size) if total > 0 else 1
    return items, total, pages
