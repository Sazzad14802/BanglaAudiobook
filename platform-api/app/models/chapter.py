"""
Chapter database model.
"""

from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.audiobook import Audiobook
    from app.models.playback import PlaybackProgress


class Chapter(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "chapters"

    audiobook_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("audiobooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    chapter_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    duration_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    audio_url: Mapped[Optional[str]] = mapped_column(
        String(1024),
        nullable=True,
    )

    # Relationships
    audiobook: Mapped["Audiobook"] = relationship(
        "Audiobook",
        back_populates="chapters",
    )
    playback_records: Mapped[list["PlaybackProgress"]] = relationship(
        "PlaybackProgress",
        back_populates="chapter",
    )
