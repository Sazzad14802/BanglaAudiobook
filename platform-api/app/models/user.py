"""
User database model.
"""

from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer, DateTime, UniqueConstraint
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.audiobook import Audiobook
    from app.models.library import LibraryItem
    from app.models.playback import PlaybackProgress


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    account_type: Mapped[str] = mapped_column(String(20), default="listener", nullable=False)
    publisher_status: Mapped[str] = mapped_column(String(40), default="pending_approval", nullable=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(150))
    premium_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    subscription_cancelled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    __table_args__ = (
        UniqueConstraint("email", "account_type", name="uq_users_email_namespace"),
        UniqueConstraint("username", "account_type", name="uq_users_username_namespace"),
    )

    # Relationships
    audiobooks: Mapped[list["Audiobook"]] = relationship(
        "Audiobook",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    library_items: Mapped[list["LibraryItem"]] = relationship(
        "LibraryItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    playback_records: Mapped[list["PlaybackProgress"]] = relationship(
        "PlaybackProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
