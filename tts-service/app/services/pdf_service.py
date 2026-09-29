import io
import re
import logging
from pathlib import Path
from typing import List, Optional
import httpx
import pypdf

from app.config import settings

logger = logging.getLogger(__name__)


class PDFService:
    """Service for extracting and cleaning text from uploaded PDF documents."""

    def resolve_pdf_bytes(self, source_url_or_path: str) -> bytes:
        """
        Fetch PDF bytes from local storage or via HTTP.
        Supports:
        - Relative URL like '/uploads/sources/xxx.pdf'
        - Full URL like 'http://localhost:8000/uploads/sources/xxx.pdf'
        - Direct filesystem path
        """
        # 1. Full URL
        if source_url_or_path.startswith(("http://", "https://")):
            logger.info("Downloading PDF from URL: %s", source_url_or_path)
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(source_url_or_path)
                resp.raise_for_status()
                return resp.content

        # 2. Local filesystem path
        raw_path = Path(source_url_or_path)
        if raw_path.exists() and raw_path.is_file():
            return raw_path.read_bytes()

        # 3. Path relative to platform-api uploads
        # (e.g. '/uploads/sources/xxx.pdf')
        clean_path = source_url_or_path.lstrip("/")
        # Look in workspace: tts-service/../../platform-api/
        workspace_api_dir = Path(__file__).resolve().parents[3] / "platform-api"
        candidate = workspace_api_dir / clean_path
        if candidate.exists() and candidate.is_file():
            return candidate.read_bytes()

        # Check inside uploads/ if prefix was stripped
        candidate_uploads = workspace_api_dir / "uploads" / clean_path.replace("uploads/", "")
        if candidate_uploads.exists() and candidate_uploads.is_file():
            return candidate_uploads.read_bytes()

        # 4. Fallback: try fetching from Platform API server
        fallback_url = f"{settings.PLATFORM_API_URL.rstrip('/api/v1')}/{clean_path}"
        logger.info("Attempting HTTP fetch from Platform API: %s", fallback_url)
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(fallback_url)
            resp.raise_for_status()
            return resp.content

    def extract_text(self, pdf_bytes: bytes) -> str:
        """Extract raw text from PDF bytes using pypdf."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages_text: List[str] = []

            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                text = text.strip()
                if text:
                    pages_text.append(text)

            full_text = "\n\n".join(pages_text)
            return self.clean_text(full_text)
        except Exception as e:
            logger.warning("pypdf extraction error (file may be malformed or non-standard PDF): %s", e)
            return ""

    def clean_text(self, text: str) -> str:
        """Clean up extracted PDF text for natural TTS reading."""
        # Replace multiple whitespace / newlines with clean spacing
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Remove hyphenated linebreaks: "commu-\nnity" -> "community"
        text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
        return text.strip()

    def chunk_text(self, text: str, max_chunk_chars: int = 500) -> List[str]:
        """
        Split text into digestible chunks for TTS models.
        Splits by Bangla Dari (।), English period (.), or newlines.
        """
        if not text:
            return []

        # Split on sentence boundaries: Bangla Dari (।), ?, !, or newline
        sentences = re.split(r"([।?!.\n]+)", text)
        chunks: List[str] = []
        current_chunk = ""

        i = 0
        while i < len(sentences):
            part = sentences[i]
            punct = sentences[i + 1] if i + 1 < len(sentences) else ""
            sentence = part + punct
            i += 2

            if not sentence.strip():
                continue

            if len(current_chunk) + len(sentence) > max_chunk_chars and current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks


pdf_service = PDFService()
