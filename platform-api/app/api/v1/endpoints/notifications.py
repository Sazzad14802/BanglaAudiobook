"""
Notifications router: the signed-in user's inbox and device push-token registration.
Every query is scoped to the current user; ids from other accounts behave as 404.
"""

from datetime import datetime, timezone
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, select, update

from app.api.deps import CurrentUserDep, DatabaseDep
from app.models.notification import Notification, PushToken

router = APIRouter()


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    title: str
    body: str
    data: dict
    read_at: Optional[datetime]
    created_at: datetime


class PushTokenInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    # Expo tokens look like ExponentPushToken[xxxx]; accept native FCM tokens too.
    token: str = Field(min_length=10, max_length=255)
    platform: Literal["android", "ios", "web"] = "android"


@router.get("", response_model=list[NotificationRead], summary="List my notifications (newest first)")
async def list_notifications(
    db: DatabaseDep,
    user: CurrentUserDep,
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
) -> list[NotificationRead]:
    rows = (await db.scalars(
        select(Notification).where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc()).offset((page - 1) * size).limit(size)
    )).all()
    return [NotificationRead.model_validate(r) for r in rows]


@router.get("/unread-count", summary="Number of unread notifications")
async def unread_count(db: DatabaseDep, user: CurrentUserDep) -> dict:
    count = await db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None)))
    return {"count": count or 0}


@router.post("/read-all", summary="Mark every notification as read")
async def read_all(db: DatabaseDep, user: CurrentUserDep) -> dict:
    await db.execute(update(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    ).values(read_at=datetime.now(timezone.utc)))
    await db.commit()
    return {"count": 0}


@router.post("/{id}/read", response_model=NotificationRead, summary="Mark one notification as read")
async def mark_read(id: uuid.UUID, db: DatabaseDep, user: CurrentUserDep) -> NotificationRead:
    row = await db.scalar(select(Notification).where(Notification.id == id, Notification.user_id == user.id))
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    if not row.read_at:
        row.read_at = datetime.now(timezone.utc)
        await db.commit()
    return NotificationRead.model_validate(row)


@router.post("/push-tokens", status_code=status.HTTP_204_NO_CONTENT, summary="Register this device for push")
async def register_push_token(data: PushTokenInput, db: DatabaseDep, user: CurrentUserDep):
    row = await db.scalar(select(PushToken).where(PushToken.token == data.token))
    if row:
        # The device switched accounts: pushes must follow the current sign-in only.
        row.user_id, row.platform = user.id, data.platform
        row.updated_at = datetime.now(timezone.utc)
    else:
        db.add(PushToken(user_id=user.id, token=data.token, platform=data.platform))
    await db.commit()


@router.post("/push-tokens/remove", status_code=status.HTTP_204_NO_CONTENT, summary="Unregister this device")
async def remove_push_token(data: PushTokenInput, db: DatabaseDep, user: CurrentUserDep):
    await db.execute(delete(PushToken).where(PushToken.token == data.token, PushToken.user_id == user.id))
    await db.commit()
