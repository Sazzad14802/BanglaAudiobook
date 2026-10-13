"""
Authentication Pydantic schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Literal
from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    account_type: Literal["listener", "publisher"] = "listener"
    full_name: str = Field(default="", max_length=150)
    username: str = Field(min_length=3, max_length=50, description="Unique username")
    email: str = Field(min_length=5, max_length=255, description="Unique user email address")
    password: str = Field(min_length=6, max_length=128, description="Password (at least 6 chars)")

    @field_validator("password")
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value

    @field_validator("email")
    @classmethod
    def email_format(cls, value):
        import re
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Invalid email address")
        return value

    @field_validator("username")
    @classmethod
    def username_format(cls, value):
        import re
        if not re.fullmatch(r"[A-Za-z0-9_]{3,50}", value.strip()):
            raise ValueError("Username must contain letters, numbers or underscores")
        return value.strip()


class LoginRequest(BaseModel):
    account_type: Literal["listener", "publisher", "admin"] = "listener"
    username_or_email: str = Field(description="Username or email address")
    password: str = Field(description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
