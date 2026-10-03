"""
FastAPI application entry point and factory.
Configures CORS, routers, static file mounting, and health checks.
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Backend API for the Audiobook Streaming Platform. "
            "Handles user authentication, audiobook management, public discovery, "
            "chapters, personal libraries, playback progress, PDF document uploads, "
            "and asynchronous generation job coordination with the Model Runner."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ── Middleware ─────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static Uploads Serving ─────────────────────────────────────────────
    # Creates uploads directory and mounts it for local static file delivery
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads",
        StaticFiles(directory=str(upload_path)),
        name="uploads",
    )

    # ── Health check ───────────────────────────────────────────────────────
    @app.get("/health", tags=["health"], summary="Health check")
    async def health() -> dict:
        """Returns a simple OK response to confirm the API is alive and running."""
        return {"status": "ok", "version": settings.APP_VERSION}

    # ── Root redirect to documentation ─────────────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root():
        return RedirectResponse(url="/docs")

    # ── API routers ────────────────────────────────────────────────────────
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()  # Bangla AudioBook Platform API
