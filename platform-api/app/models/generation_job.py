"""
Generation Job database model.
Tracks asynchronous AI Model Runner generation requests for an audiobook.
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
import uuid
from sqlalchemy import DateTime, Enum, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin
from app.models.audiobook import AudiobookStatus

if TYPE_CHECKING:
    from app.models.audiobook import Audiobook


class GenerationJob(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "generation_jobs"

    audiobook_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("audiobooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[AudiobookStatus] = mapped_column(
        Enum(AudiobookStatus, native_enum=False),
        default=AudiobookStatus.PENDING,
        index=True,
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    audiobook: Mapped["Audiobook"] = relationship(
        "Audiobook",
        back_populates="generation_jobs",
    )
