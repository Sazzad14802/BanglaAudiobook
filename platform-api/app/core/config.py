"""
Application configuration using pydantic-settings.
All credentials and environment variables are loaded here.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────────────────────
    APP_NAME: str = "Audiobook Platform API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── Server ─────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── CORS ───────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins, or "*"
    ALLOWED_ORIGINS: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        if self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── Database ───────────────────────────────────────────────────────────
    # Async connection string for FastAPI application (SQLAlchemy AsyncEngine)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:12345@localhost:5432/audiobook_db"
    
    # Sync connection string for Alembic migrations (optional override)
    SYNC_DATABASE_URL: Optional[str] = None

    @property
    def sync_database_url(self) -> str:
        """Returns a synchronous database URL for Alembic migrations."""
        if self.SYNC_DATABASE_URL:
            return self.SYNC_DATABASE_URL
        # Replace async driver with sync driver (psycopg)
        url = self.DATABASE_URL
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "+psycopg")
        if "+aiosqlite" in url:
            return url.replace("+aiosqlite", "")
        return url

    # ── Security & Authentication ──────────────────────────────────────────
    JWT_SECRET_KEY: str = "insecure-development-secret-key-change-in-production-1234567890"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── Storage ────────────────────────────────────────────────────────────
    STORAGE_TYPE: str = "local"  # "local", future: "s3"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Model Runner Dispatcher ────────────────────────────────────────────
    # Dispatcher strategy for AI Model Runner boundary
    MODEL_RUNNER_DISPATCHER: str = "http"  # "mock", "http"
    MODEL_RUNNER_URL: str = "http://localhost:8001/jobs"


settings = Settings()
