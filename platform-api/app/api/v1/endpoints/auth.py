"""
Authentication router: registration, login, and current authenticated identity.
"""

from fastapi import APIRouter, status

from app.api.deps import CurrentUserDep, DatabaseDep
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services import auth_service

router = APIRouter()


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    data: RegisterRequest,
    db: DatabaseDep,
) -> UserRead:
    """Register a new user account with unique username and email."""
    user = await auth_service.register_user(db, data)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login with JWT generation",
)
async def login(
    data: LoginRequest,
    db: DatabaseDep,
) -> TokenResponse:
    """Authenticate with username/email and password to receive a JWT access token."""
    user = await auth_service.authenticate_user(
        db,
        username_or_email=data.username_or_email,
        password=data.password,
    )
    return auth_service.create_user_token(user)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user profile",
)
async def get_auth_me(
    current_user: CurrentUserDep,
) -> UserRead:
    """Retrieve identity of the currently authenticated token bearer."""
    return UserRead.model_validate(current_user)
