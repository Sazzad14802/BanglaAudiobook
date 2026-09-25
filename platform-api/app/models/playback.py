"""
Playback Progress database model.
Tracks the user's current listening position and chapter for an audiobook.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import DateTime, Float, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.audiobook import Audiobook
    from app.models.chapter import Chapter


class PlaybackProgress(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "playback_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    audiobook_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("audiobooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chapter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chapters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    position_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "audiobook_id", name="uq_user_audiobook_playback"),
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="playback_records",
    )
    audiobook: Mapped["Audiobook"] = relationship(
        "Audiobook",
        back_populates="playback_records",
    )
    chapter: Mapped[Optional["Chapter"]] = relationship(
        "Chapter",
        back_populates="playback_records",
    )
