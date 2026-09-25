"""
Library Pydantic schemas.
"""

from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict
from app.schemas.audiobook import AudiobookRead


class LibraryItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    audiobook_id: uuid.UUID
    added_at: datetime
    audiobook: AudiobookRead


class LibraryListResponse(BaseModel):
    items: list[LibraryItemRead]
    total: int
    page: int
    size: int
    pages: int
