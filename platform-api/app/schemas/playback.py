"""
Playback Progress Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class PlaybackProgressUpdate(BaseModel):
    chapter_id: Optional[uuid.UUID] = Field(
        default=None,
        description="ID of the chapter being listened to, or null if beginning"
    )
    position_seconds: float = Field(
        ge=0.0,
        description="Playback offset in seconds within the chapter/audiobook"
    )


class PlaybackProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    audiobook_id: uuid.UUID
    chapter_id: Optional[uuid.UUID]
    position_seconds: float
    updated_at: datetime
