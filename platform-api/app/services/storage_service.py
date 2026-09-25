"""
Storage service abstraction for saving and retrieving uploaded source documents.
Implements LocalStorageService; designed to easily swap with S3/R2/MinIO.
"""

from abc import ABC, abstractmethod
import os
from pathlib import Path
import shutil
from typing import Optional
import uuid
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


class BaseStorageService(ABC):
    """Abstract interface for file storage backends."""

    @abstractmethod
    async def save_upload_file(
        self,
        file: UploadFile,
        subfolder: str = "sources",
    ) -> str:
        """Save an uploaded file and return its accessible URL / storage key."""
        pass

    @abstractmethod
    async def get_file_path(self, file_url_or_key: str) -> Optional[str]:
        """Resolve a storage URL/key to a local filesystem path if available."""
        pass

    @abstractmethod
    async def delete_file(self, file_url_or_key: str) -> bool:
        """Delete a stored file by URL/key."""
        pass


class LocalStorageService(BaseStorageService):
    """Local filesystem storage implementation."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload_file(
        self,
        file: UploadFile,
        subfolder: str = "sources",
    ) -> str:
        # Validate file type: must be PDF
        filename = file.filename or "document.pdf"
        extension = Path(filename).suffix.lower()
        if extension != ".pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: expected a .pdf file, got '{extension or 'unknown'}'",
            )

        target_dir = self.base_dir / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        # Unique filename to avoid collisions
        unique_filename = f"{uuid.uuid4()}_{Path(filename).name}"
        destination_path = target_dir / unique_filename

        max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        total_size = 0

        # Stream file to disk while checking size limit
        try:
            with open(destination_path, "wb") as out_file:
                while chunk := await file.read(1024 * 64):  # 64KB chunks
                    total_size += len(chunk)
                    if total_size > max_size_bytes:
                        out_file.close()
                        if destination_path.exists():
                            destination_path.unlink()
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
                        )
                    out_file.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            if destination_path.exists():
                destination_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}",
            )

        # Return standardized URL/path reference
        relative_path = f"/uploads/{subfolder}/{unique_filename}"
        return relative_path

    async def get_file_path(self, file_url_or_key: str) -> Optional[str]:
        clean_key = file_url_or_key.lstrip("/")
        if clean_key.startswith("uploads/"):
            clean_key = clean_key[len("uploads/"):]
        file_path = self.base_dir / clean_key
        if file_path.exists():
            return str(file_path.resolve())
        return None

    async def delete_file(self, file_url_or_key: str) -> bool:
        path_str = await self.get_file_path(file_url_or_key)
        if path_str and os.path.exists(path_str):
            try:
                os.remove(path_str)
                return True
            except OSError:
                return False
        return False


def get_storage_service() -> BaseStorageService:
    """Storage service provider."""
    return LocalStorageService()
