"""
Users router: profile endpoints.
"""

from fastapi import APIRouter

from app.api.deps import CurrentUserDep
from app.schemas.user import UserRead

router = APIRouter()


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get user profile",
)
async def get_current_user_profile(
    current_user: CurrentUserDep,
) -> UserRead:
    """Retrieve profile of the currently authenticated user without sensitive data."""
    return UserRead.model_validate(current_user)
