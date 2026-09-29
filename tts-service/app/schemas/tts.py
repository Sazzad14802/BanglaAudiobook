from typing import List, Optional
from pydantic import BaseModel, Field


class TextRequest(BaseModel):
    text: str = Field(..., description="Text content to synthesize into speech")
    language: str = Field(default="bn", description="Language code: 'bn' (Bangla), 'en' (English), etc.")
    speaker: Optional[str] = Field(default=None, description="Speaker voice name (for XTTS or multi-speaker models)")
    model_type: Optional[str] = Field(
        default=None, 
        description="Optional model override: 'bangla_vits' (specialized Bengali VITS) or 'xtts' (XTTS v2)"
    )


class SpeakerInfo(BaseModel):
    name: str
    gender: str
    tag: str
    language: str = "multilingual"


class SpeakersResponse(BaseModel):
    speakers: List[SpeakerInfo]


class GenerationJobPayload(BaseModel):
    job_id: str = Field(..., description="Unique generation job ID from Platform API")
    audiobook_id: str = Field(..., description="Target audiobook ID")
    source_document_url: str = Field(..., description="Path or URL to source document / text")
    language: str = Field(default="bn", description="Target language code")


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    message: str
    audiobook_id: Optional[str] = None
    output_path: Optional[str] = None
