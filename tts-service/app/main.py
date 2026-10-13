import os
import sys
import logging
from pathlib import Path

# Ensure UTF-8 output encoding on Windows consoles to prevent charmap errors with Bengali characters
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from starlette.responses import JSONResponse
import secrets
import threading
from starlette.background import BackgroundTask

_synthesis_lock = threading.Lock()
_ocr_lock = threading.Lock()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas.tts import (
    TextRequest,
    SpeakersResponse,
    GenerationJobPayload,
    JobStatusResponse,
)
from app.services.tts_service import tts_service
from app.services.job_service import job_service

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tts-service")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Dedicated AI TTS Service for Bangla and Multilingual Audio Generation.",
)

@app.middleware("http")
async def service_auth(request: Request, call_next):
    if request.url.path not in {"/health", "/docs", "/openapi.json", "/"}:
        if settings.TTS_SERVICE_KEY:
            key = request.headers.get("X-Service-Key", "")
            if not secrets.compare_digest(key, settings.TTS_SERVICE_KEY):
                return JSONResponse({"detail": "Service authentication required"}, status_code=401)
    return await call_next(request)

@app.post("/extract-page")
async def extract_page(file: UploadFile = File(...), language: str = Form("bn")):
    import asyncio
    from app.services.gemini_service import gemini_service
    raw = await file.read(20 * 1024 * 1024 + 1)
    if len(raw) > 20 * 1024 * 1024 or not raw.startswith(b"%PDF-"):
        raise HTTPException(400, "Invalid page PDF")
    def extract():
        with _ocr_lock:
            return gemini_service.extract_text_from_pdf(raw, language)
    text = await asyncio.to_thread(extract)
    return {"text": text}

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "endpoints": {
            "health": "/health",
            "speakers": "/speakers",
            "generate": "POST /generate",
            "jobs": "POST /jobs",
            "job_status": "GET /jobs/{job_id}",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tts-service"}


@app.get("/speakers", response_model=SpeakersResponse)
def get_speakers():
    """Retrieve list of available TTS voices and speakers."""
    speakers = tts_service.get_speakers()
    return SpeakersResponse(speakers=speakers)


@app.post("/generate")
def generate_audio(request: TextRequest):
    """
    Direct TTS generation endpoint.
    Synthesizes speech text and streams back the resulting WAV audio.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        with _synthesis_lock:
            audio_path = tts_service.synthesize(
                text=request.text,
                language=request.language,
                speaker=request.speaker,
                model_type=request.model_type,
            )

        filename = Path(audio_path).name
        return FileResponse(
            path=audio_path,
            media_type="audio/wav",
            filename=filename,
            background=BackgroundTask(Path(audio_path).unlink, missing_ok=True),
        )
    except Exception as exc:
        logger.error("TTS generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/jobs", response_model=JobStatusResponse)
async def create_job(payload: GenerationJobPayload):
    """
    Job dispatcher endpoint called by Platform API HTTPGenerationDispatcher.
    Queues asynchronous audio generation for an uploaded audiobook.
    """
    raise HTTPException(410, "Use the Platform API durable queue worker")


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    """Query progress and output of a generation job."""
    return job_service.get_job_status(job_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
