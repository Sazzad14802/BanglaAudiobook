"""
API v1 main router.

Register feature routers here as they are implemented:
  - auth
  - users
  - audiobooks
  - library
  - search
  - playback
  - uploads
  - generation jobs
"""

from fastapi import APIRouter

api_router = APIRouter()

# Future routers will be included here, e.g.:
# from app.api.v1.endpoints import auth, users, audiobooks
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(audiobooks.router, prefix="/audiobooks", tags=["audiobooks"])
