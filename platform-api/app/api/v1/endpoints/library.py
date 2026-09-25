"""
Library router: personal audiobook collections and bookmarks.
"""

import uuid
from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUserDep, DatabaseDep
from app.schemas.library import LibraryItemRead, LibraryListResponse
from app.services import library_service

router = APIRouter()


@router.get(
    "",
    response_model=LibraryListResponse,
    summary="List audiobooks in the current user's library",
)
async def get_my_library(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1, description="Page number"),
    size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> LibraryListResponse:
    """Retrieve saved audiobooks from the authenticated user's personal library."""
    items, total, pages = await library_service.get_user_library(
        db=db,
        user=current_user,
        page=page,
        size=size,
    )
    return LibraryListResponse(
        items=[LibraryItemRead.model_validate(item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.post(
    "/{audiobook_id}",
    response_model=LibraryItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add an audiobook to your personal library",
)
async def add_to_library(
    audiobook_id: uuid.UUID,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> LibraryItemRead:
    """
    Add a public, completed audiobook to the user's personal library.
    Cannot add private audiobooks belonging to other users.
    Rejects duplicate entries.
    """
    item = await library_service.add_to_library(
        db=db,
        user=current_user,
        audiobook_id=audiobook_id,
    )
    return LibraryItemRead.model_validate(item)


@router.delete(
    "/{audiobook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an audiobook from your personal library",
)
async def remove_from_library(
    audiobook_id: uuid.UUID,
    db: DatabaseDep,
    current_user: CurrentUserDep,
):
    """Remove an audiobook from the authenticated user's personal library."""
    await library_service.remove_from_library(
        db=db,
        user=current_user,
        audiobook_id=audiobook_id,
    )
    return None
