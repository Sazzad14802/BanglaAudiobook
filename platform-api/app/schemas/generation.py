"""
Generation Job Pydantic schemas.
"""

from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict
from app.models.audiobook import AudiobookStatus


class GenerationJobResponse(BaseModel):
    job_id: uuid.UUID
    status: AudiobookStatus
    message: str = "Audiobook generation job submitted successfully"


class GenerationJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    audiobook_id: uuid.UUID
    status: AudiobookStatus
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class AudiobookGenerationStatusResponse(BaseModel):
    audiobook_id: uuid.UUID
    audiobook_status: AudiobookStatus
    latest_job: Optional[GenerationJobRead]
    history: list[GenerationJobRead]
