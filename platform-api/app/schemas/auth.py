"""
Authentication Pydantic schemas.
"""

from pydantic import BaseModel, Field
from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    email: str = Field(min_length=5, max_length=255, description="Unique user email address")
    password: str = Field(min_length=6, max_length=128, description="Password (at least 6 chars)")


class LoginRequest(BaseModel):
    username_or_email: str = Field(description="Username or email address")
    password: str = Field(description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
