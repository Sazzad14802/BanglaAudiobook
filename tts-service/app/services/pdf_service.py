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
    """
    Service for extracting and cleaning text from uploaded PDF documents.
    Features:
    1. Fast-path text extraction via pypdf.
    2. Automatic corruption detection (e.g. broken Word / Bijoy font CMap encodings).
    3. EasyOCR visual fallback for scanned PDFs or garbled TrueType exports.
    """

    def __init__(self):
        self._ocr_reader = None

    @property
    def ocr_reader(self):
        """Lazy-loaded EasyOCR reader instance."""
        if self._ocr_reader is None:
            logger.info("Initializing EasyOCR reader for Bengali and English...")
            import easyocr
            self._ocr_reader = easyocr.Reader(["bn", "en"], gpu=settings.USE_CUDA)
        return self._ocr_reader

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

    def is_text_corrupted(self, text: str, language: str = "bn") -> bool:
        """
        Detects if extracted text is empty or suffers from font encoding corruption
        (common when exporting from Microsoft Word / InDesign with custom TrueType fonts).
        """
        if not text or len(text.strip()) < 10:
            return True

        if language == "bn":
            # 1. Standalone ি placed before consonants or at start of words (e.g. িার, িখন, িাই)
            detached_i_count = len(re.findall(r"(?:^|\s)ি[ক-হ]", text))
            # 2. False 'স' acting as E-kar prefix before consonants (e.g. সস, সপশায়, সলখক, সরচখ, সকউ, সগালাপ)
            e_kar_as_sa_count = len(re.findall(r"(?:^|\s)স[ক-হ][ক-হ]", text))
            # 3. False 'চ' acting as E-kar infix before consonants (e.g. সকাচল, এচস, বচস, ভচর, ধচর)
            e_kar_as_cha_count = len(re.findall(r"[ক-হ]চ[ক-হ]", text))
            # 4. Words with repeated false 'ত' (hrosh-I) before consonants (e.g. তনতরতবতল, একতট, তকন্তু)
            false_ta_count = len(re.findall(r"ত[ক-হ]", text))

            # 5. Known corrupted tokens from Word Kalpurush / Bijoy exports
            telltale_tokens = [
                "প্রতিতিন", "শাতিচি", "তনতরতবতল", "একতট", "অদ্ভুি",
                "ঘটচে", "হিাৎ", "তজচেস", "বযতি", "তিিীয়", "সািা", "সোট", "তেল", "তিক", "িরজা"
            ]
            telltale_count = sum(1 for token in telltale_tokens if token in text)

            words = text.split()
            total_words = max(1, len(words))

            if telltale_count >= 1:
                logger.warning(
                    "Detected %d telltale corrupted Bengali tokens in extracted PDF text.",
                    telltale_count,
                )
                return True

            corruption_density = (detached_i_count + e_kar_as_sa_count + e_kar_as_cha_count) / total_words
            if corruption_density > 0.08:
                logger.warning(
                    "High Bengali font corruption density: %.2f%%",
                    corruption_density * 100,
                )
                return True

            if false_ta_count / total_words > 0.2:
                logger.warning(
                    "Unusual ratio of false 'ত' prefixes: %.2f%%",
                    (false_ta_count / total_words) * 100,
                )
                return True

        return False

    def extract_text_via_ocr(self, pdf_bytes: bytes) -> str:
        """
        Renders PDF pages to images via pypdfium2 and runs EasyOCR on the visual canvas.
        Bypasses broken ToUnicode / font tables completely.
        """
        try:
            import pypdfium2 as pdfium
            import numpy as np

            logger.info("Starting EasyOCR visual extraction on PDF...")
            pdf = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
            all_text_lines: List[str] = []

            for page_idx in range(len(pdf)):
                logger.info("Running EasyOCR on page %d/%d...", page_idx + 1, len(pdf))
                page = pdf[page_idx]
                image = page.render(scale=2.0).to_pil()
                img_np = np.array(image)

                page_lines = self.ocr_reader.readtext(img_np, detail=0)
                if page_lines:
                    all_text_lines.extend(page_lines)

            full_ocr_text = "\n".join(all_text_lines)
            logger.info(
                "EasyOCR successfully extracted %d lines from %d pages.",
                len(all_text_lines),
                len(pdf),
            )
            return self.clean_text(full_ocr_text)
        except Exception as e:
            logger.error("EasyOCR fallback failed: %s", e)
            return ""

    def extract_text(self, pdf_bytes: bytes, language: str = "bn") -> str:
        """
        Extract text with smart two-tier pipeline:
        1. Fast text extraction via pypdf.
        2. If text is empty or corrupted, automatically triggers EasyOCR fallback.
        """
        raw_text = ""
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages_text: List[str] = []

            for page in reader.pages:
                text = page.extract_text() or ""
                text = text.strip()
                if text:
                    pages_text.append(text)

            raw_text = "\n\n".join(pages_text)
        except Exception as e:
            logger.warning("pypdf extraction error: %s", e)

        # Check if extracted text is valid or corrupted
        if self.is_text_corrupted(raw_text, language=language):
            logger.info("Extracted text is empty or corrupted. Engaging EasyOCR visual pipeline...")
            ocr_text = self.extract_text_via_ocr(pdf_bytes)
            if ocr_text:
                return ocr_text

        return self.clean_text(raw_text)

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
