"""
Chapter Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ChapterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    chapter_number: int = Field(ge=1)
    duration_seconds: float = Field(default=0.0, ge=0.0)
    audio_url: Optional[str] = None


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audiobook_id: uuid.UUID
    title: str
    chapter_number: int
    duration_seconds: float
    audio_url: Optional[str]
    created_at: datetime
    updated_at: datetime
