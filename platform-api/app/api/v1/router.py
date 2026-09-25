"""
API v1 main router.
Aggregates all feature endpoints under /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    audiobooks,
    auth,
    library,
    playback,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(audiobooks.router, prefix="/audiobooks", tags=["audiobooks"])
api_router.include_router(library.router, prefix="/library", tags=["library"])
api_router.include_router(playback.router, prefix="/playback", tags=["playback"])
