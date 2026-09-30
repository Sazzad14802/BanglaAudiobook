import asyncio
import logging
import os
import shutil
import wave
from pathlib import Path
from typing import Dict, Any

import httpx

from app.schemas.tts import GenerationJobPayload, JobStatusResponse
from app.services.tts_service import tts_service
from app.services.pdf_service import pdf_service
from app.config import settings

logger = logging.getLogger(__name__)

# In-memory job tracking store
_job_store: Dict[str, Dict[str, Any]] = {}


class JobService:
    """Handles asynchronous audiobook generation jobs received from Platform API."""

    async def submit_job(self, payload: GenerationJobPayload) -> JobStatusResponse:
        """Register and initiate background generation for an audiobook."""
        job_id = payload.job_id
        logger.info("Received generation job %s for audiobook %s", job_id, payload.audiobook_id)

        _job_store[job_id] = {
            "status": "PROCESSING",
            "audiobook_id": payload.audiobook_id,
            "source_document_url": payload.source_document_url,
            "language": payload.language,
            "output_path": None,
            "error": None,
        }

        # Launch background processing without blocking the API response
        asyncio.create_task(self._process_job(job_id, payload))

        return JobStatusResponse(
            job_id=job_id,
            status="PROCESSING",
            message="Generation job queued and started in TTS Service.",
            audiobook_id=payload.audiobook_id,
        )

    async def _process_job(self, job_id: str, payload: GenerationJobPayload):
        """Asynchronous pipeline: PDF Text Extraction -> Text Cleaning -> TTS Synthesis."""
        try:
            logger.info("Processing job %s in background...", job_id)
            loop = asyncio.get_running_loop()

            # 1. Fetch & Extract text from PDF
            logger.info("Extracting text from source PDF: %s", payload.source_document_url)
            pdf_bytes = await loop.run_in_executor(
                None,
                lambda: pdf_service.resolve_pdf_bytes(payload.source_document_url),
            )
            extracted_text = await loop.run_in_executor(
                None,
                lambda: pdf_service.extract_text(pdf_bytes, language=payload.language),
            )

            # If no selectable text found (e.g. scanned image PDF)
            if not extracted_text.strip():
                logger.warning("No selectable text extracted from PDF. Using informative fallback notice.")
                extracted_text = (
                    "পিডিএফ থেকে কোনো সরাসরি টেক্সট পাওয়া যায়নি। এটি একটি স্ক্যান করা ছবি হতে পারে।"
                    if payload.language == "bn"
                    else "No selectable text found in the PDF. It may be a scanned document."
                )

            logger.info("Synthesizing audiobook audio (%d total chars)...", len(extracted_text))

            output_file = f"audiobook_{payload.audiobook_id[:8]}_{job_id[:8]}.wav"

            # 2. Run TTS in a worker thread to avoid blocking the asyncio loop
            audio_path = await loop.run_in_executor(
                None,
                lambda: tts_service.synthesize(
                    text=extracted_text,
                    language=payload.language,
                    output_filename=output_file,
                )
            )

            _job_store[job_id]["status"] = "COMPLETED"
            _job_store[job_id]["output_path"] = audio_path
            logger.info("Job %s audio generated successfully: %s", job_id, audio_path)

            # 3. Deliver audio to Platform API static uploads directory
            output_filename = Path(audio_path).name
            platform_audio_dir = Path(__file__).resolve().parents[3] / "platform-api" / "uploads" / "audio"
            platform_audio_dir.mkdir(parents=True, exist_ok=True)
            target_dest = platform_audio_dir / output_filename

            shutil.copyfile(str(audio_path), str(target_dest))
            relative_audio_url = f"/uploads/audio/{output_filename}"

            # Calculate duration in seconds
            duration_secs = 0.0
            try:
                with wave.open(str(audio_path), "rb") as wf:
                    duration_secs = round(wf.getnframes() / float(wf.getframerate()), 2)
            except Exception:
                pass

            # 4. Notify Platform API that generation is COMPLETED
            callback_url = f"{settings.PLATFORM_API_URL}/audiobooks/generation-callback"
            logger.info("Sending completion callback to Platform API: %s", callback_url)
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    cb_resp = await client.post(
                        callback_url,
                        json={
                            "job_id": job_id,
                            "audiobook_id": payload.audiobook_id,
                            "status": "COMPLETED",
                            "audio_url": relative_audio_url,
                            "duration_seconds": duration_secs,
                        },
                    )
                    logger.info("Platform API callback acknowledged: %s", cb_resp.status_code)
            except Exception as cb_exc:
                logger.error("Failed to notify Platform API of completion: %s", cb_exc)

        except Exception as exc:
            logger.error("Job %s failed during generation: %s", job_id, exc)
            _job_store[job_id]["status"] = "FAILED"
            _job_store[job_id]["error"] = str(exc)

            # Notify Platform API of failure
            try:
                callback_url = f"{settings.PLATFORM_API_URL}/audiobooks/generation-callback"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        callback_url,
                        json={
                            "job_id": job_id,
                            "audiobook_id": payload.audiobook_id,
                            "status": "FAILED",
                            "error": str(exc),
                        },
                    )
            except Exception:
                pass

    def get_job_status(self, job_id: str) -> JobStatusResponse:
        """Query current state of a generation job."""
        if job_id not in _job_store:
            return JobStatusResponse(
                job_id=job_id,
                status="NOT_FOUND",
                message=f"Job {job_id} not found in TTS service store.",
            )
        job = _job_store[job_id]
        return JobStatusResponse(
            job_id=job_id,
            status=job["status"],
            message=job.get("error") or "Job processing.",
            audiobook_id=job.get("audiobook_id"),
            output_path=job.get("output_path"),
        )


job_service = JobService()
