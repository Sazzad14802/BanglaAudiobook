"""
User database model.
"""

from typing import TYPE_CHECKING
from sqlalchemy import String
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
        unique=True,
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
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
