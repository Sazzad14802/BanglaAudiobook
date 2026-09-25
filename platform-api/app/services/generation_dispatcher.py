"""
Model Runner Integration Boundary.

Defines the contract for dispatching audiobook generation jobs to the external
Model Runner service (OCR -> Text Processing -> TTS -> FFmpeg).
The Platform API never runs OCR/TTS directly; it simply dispatches the job.
"""

from abc import ABC, abstractmethod
import logging
from typing import Any, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseGenerationDispatcher(ABC):
    """Abstract dispatcher contract for submitting generation jobs to the Model Runner."""

    @abstractmethod
    async def dispatch(self, payload: Dict[str, Any]) -> bool:
        """
        Dispatch a generation job payload to the queue/broker or HTTP service.

        Expected payload schema:
        {
            "job_id": "UUID string",
            "audiobook_id": "UUID string",
            "source_document_url": "URL/path string",
            "language": "Language code (e.g. en, bn)"
        }
        """
        pass


class MockGenerationDispatcher(BaseGenerationDispatcher):
    """
    Default mock/stub dispatcher.
    Logs the dispatch event and simulates successful queue acceptance.
    Used for local development and testing without an active Model Runner broker.
    """

    async def dispatch(self, payload: Dict[str, Any]) -> bool:
        logger.info(
            "MockGenerationDispatcher: Dispatched generation job to Model Runner queue: %s",
            payload,
        )
        return True


class HTTPGenerationDispatcher(BaseGenerationDispatcher):
    """
    Example HTTP webhook dispatcher for when Model Runner exposes an HTTP endpoint.
    Can be configured via environment settings.
    """

    def __init__(self, endpoint_url: str):
        self.endpoint_url = endpoint_url

    async def dispatch(self, payload: Dict[str, Any]) -> bool:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.endpoint_url, json=payload)
                response.raise_for_status()
                return True
        except Exception as exc:
            logger.error("HTTP dispatch to Model Runner failed: %s", exc)
            return False


def get_generation_dispatcher() -> BaseGenerationDispatcher:
    """Factory returning the configured generation dispatcher."""
    strategy = settings.MODEL_RUNNER_DISPATCHER.lower()
    if strategy == "http":
        return HTTPGenerationDispatcher(endpoint_url="http://localhost:8001/jobs")
    return MockGenerationDispatcher()
