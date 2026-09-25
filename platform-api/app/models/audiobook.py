"""
Audiobook database model and status/visibility enums.
"""

import enum
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.chapter import Chapter
    from app.models.generation_job import GenerationJob
    from app.models.library import LibraryItem
    from app.models.playback import PlaybackProgress


class AudiobookVisibility(str, enum.Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class AudiobookStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Audiobook(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "audiobooks"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    author: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    cover_image_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )
    source_file_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        index=True,
        nullable=False,
    )
    visibility: Mapped[AudiobookVisibility] = mapped_column(
        Enum(AudiobookVisibility, native_enum=False),
        default=AudiobookVisibility.PRIVATE,
        index=True,
        nullable=False,
    )
    status: Mapped[AudiobookStatus] = mapped_column(
        Enum(AudiobookStatus, native_enum=False),
        default=AudiobookStatus.PENDING,
        index=True,
        nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="audiobooks",
    )
    chapters: Mapped[list["Chapter"]] = relationship(
        "Chapter",
        back_populates="audiobook",
        cascade="all, delete-orphan",
        order_by="Chapter.chapter_number",
    )
    generation_jobs: Mapped[list["GenerationJob"]] = relationship(
        "GenerationJob",
        back_populates="audiobook",
        cascade="all, delete-orphan",
        order_by="GenerationJob.created_at.desc()",
    )
    library_entries: Mapped[list["LibraryItem"]] = relationship(
        "LibraryItem",
        back_populates="audiobook",
        cascade="all, delete-orphan",
    )
    playback_records: Mapped[list["PlaybackProgress"]] = relationship(
        "PlaybackProgress",
        back_populates="audiobook",
        cascade="all, delete-orphan",
    )
