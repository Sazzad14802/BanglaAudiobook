"""
Playback router: save and retrieve playback progress per audiobook.
"""

from typing import Optional
import uuid
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUserDep, DatabaseDep
from app.schemas.playback import PlaybackProgressRead, PlaybackProgressUpdate
from app.services import playback_service

router = APIRouter()


@router.get(
    "/{audiobook_id}",
    response_model=PlaybackProgressRead,
    summary="Get saved playback progress for an audiobook",
)
async def get_playback_progress(
    audiobook_id: uuid.UUID,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> PlaybackProgressRead:
    """
    Retrieve the current user's saved playback position for an audiobook.
    Verifies that the user has authorization to access the audiobook.
    Returns 404 if no progress has been saved yet or book is inaccessible.
    """
    progress = await playback_service.get_playback_progress(
        db=db,
        user=current_user,
        audiobook_id=audiobook_id,
    )
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No playback progress found for this audiobook",
        )
    return PlaybackProgressRead.model_validate(progress)


@router.put(
    "/{audiobook_id}",
    response_model=PlaybackProgressRead,
    summary="Save playback position for an audiobook",
)
async def save_playback_progress(
    audiobook_id: uuid.UUID,
    data: PlaybackProgressUpdate,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> PlaybackProgressRead:
    """
    Update or create playback progress for an audiobook.
    Validations:
    - User has authorization to access the audiobook.
    - If chapter_id is provided, chapter belongs to the specified audiobook.
    """
    progress = await playback_service.save_playback_progress(
        db=db,
        user=current_user,
        audiobook_id=audiobook_id,
        chapter_id=data.chapter_id,
        position_seconds=data.position_seconds,
    )
    return PlaybackProgressRead.model_validate(progress)
