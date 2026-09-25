"""
Library database model.
Represents user personal audiobook collections (bookmarks/saved books).
"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING
import uuid
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.audiobook import Audiobook


class LibraryItem(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "library"

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
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "audiobook_id", name="uq_user_audiobook_library"),
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="library_items",
    )
    audiobook: Mapped["Audiobook"] = relationship(
        "Audiobook",
        back_populates="library_entries",
    )
