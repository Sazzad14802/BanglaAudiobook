"""
FastAPI dependency injection utilities: DB session, authenticated user, and optional user.
"""

from typing import Annotated, Optional
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.services.auth_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)

DatabaseDep = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DatabaseDep,
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
) -> User:
    """
    Dependency that enforces authentication.
    Extracts and validates the JWT Bearer token and returns the active User.
    Raises 401 Unauthorized if token is missing, expired, or invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id_str: Optional[str] = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = await get_user_by_id(db, user_id)
    if not user:
        raise credentials_exception

    return user


async def get_current_user_optional(
    db: DatabaseDep,
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
) -> Optional[User]:
    """
    Dependency for endpoints that can be accessed both anonymously
    and by authenticated users (e.g. public audiobook discovery).
    Returns None if no token or invalid token is supplied.
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id_str: Optional[str] = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = uuid.UUID(user_id_str)
        return await get_user_by_id(db, user_id)
    except (ValueError, Exception):
        return None


CurrentUserDep = Annotated[User, Depends(get_current_user)]
OptionalUserDep = Annotated[Optional[User], Depends(get_current_user_optional)]
