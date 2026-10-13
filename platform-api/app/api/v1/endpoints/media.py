"""Short-lived media grants still recheck suspension and entitlements on every request."""
from datetime import datetime, timezone, timedelta
from uuid import UUID
from pathlib import Path
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from app.api.deps import DatabaseDep, CurrentUserDep, ActivePublisherDep
from app.core.security import create_access_token, decode_access_token
from app.core.config import settings
from app.models import User, Audiobook, Chapter, AudiobookStatus
from app.models.platform import PlaySession, EligibleView
from app.schemas.platform import HeartbeatInput
from app.services.policy import authorize_audio, premium, utc, month_now, configuration
from app.services.audiobook_service import get_audiobook_for_user
from app.services.storage_service import get_storage_service

router = APIRouter()

@router.post("/audiobooks/{id}/offline-license")
async def offline_license(id: UUID, db: DatabaseDep, user: CurrentUserDep):
    book = await get_audiobook_for_user(db, id, user)
    await authorize_audio(db, book, user)
    if not premium(user) or book.status != AudiobookStatus.COMPLETED:
        raise HTTPException(403, "Offline listening requires a premium listener and completed content")
    expires = min(utc(user.premium_until), datetime.now(timezone.utc) + timedelta(hours=24))
    result = await play(id, db, user)
    return result | {"expires_at": expires.isoformat(), "user_id": str(user.id)}

@router.post("/audiobooks/{id}/play")
async def play(id: UUID, db: DatabaseDep, user: CurrentUserDep):
    book = await get_audiobook_for_user(db, id, user)
    await authorize_audio(db, book, user)
    chapters = (await db.scalars(select(Chapter).where(Chapter.audiobook_id == id).order_by(Chapter.chapter_number))).all()
    session = PlaySession(user_id=user.id, audiobook_id=id,
        eligible=premium(user) and book.access_tier == "premium" and book.owner_id != user.id)
    db.add(session)
    if user.account_type == "admin":
        from app.services.policy import audit
        audit(db, user, "audiobook.investigate", id)
    await db.commit()
    token = create_access_token(user.id, timedelta(minutes=15), {"purpose": "media", "book": str(id), "ver": user.token_version})
    items = [{"id": str(c.id), "title": c.title, "chapter_number": c.chapter_number,
              "duration_seconds": c.duration_seconds,
              "audio_url": f"/api/v1/media/{id}/{c.id}?grant={token}"} for c in chapters if c.audio_url]
    return {"session_id": session.id, "chapters": items, "expires_in": 900}

@router.get("/media/{book_id}/{chapter_id}")
async def stream(book_id: UUID, chapter_id: UUID, grant: str, db: DatabaseDep):
    payload = decode_access_token(grant)
    if not payload or payload.get("purpose") != "media" or payload.get("book") != str(book_id):
        raise HTTPException(401, "Invalid media grant")
    try:
        user = await db.get(User, UUID(payload["sub"]))
    except (ValueError, KeyError):
        raise HTTPException(401, "Invalid media grant")
    if not user or user.suspended or user.token_version != payload.get("ver"):
        raise HTTPException(403, "Media access revoked")
    book = await get_audiobook_for_user(db, book_id, user)
    await authorize_audio(db, book, user)
    chapter = await db.get(Chapter, chapter_id)
    if not chapter or chapter.audiobook_id != book_id or not chapter.audio_url:
        raise HTTPException(404, "Audio not found")
    path = await get_storage_service().get_file_path(chapter.audio_url)
    if not path:
        raise HTTPException(404, "Audio file unavailable")
    return FileResponse(path, headers={"Cache-Control": "private, no-store"})

@router.post("/plays/{id}/heartbeat")
async def heartbeat(id: UUID, data: HeartbeatInput, db: DatabaseDep, user: CurrentUserDep):
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    row = await db.scalar(select(PlaySession).where(PlaySession.id == id, PlaySession.user_id == user.id).with_for_update())
    if not row:
        raise HTTPException(404, "Play session not found")
    latest = await db.scalar(select(PlaySession.id).where(PlaySession.user_id == user.id)
        .order_by(PlaySession.started_at.desc(), PlaySession.id.desc()).limit(1))
    if latest != row.id:
        raise HTTPException(409, "A newer listening session is active")
    book = await get_audiobook_for_user(db, row.audiobook_id, user)
    await authorize_audio(db, book, user)
    now = datetime.now(timezone.utc)
    elapsed = (now - utc(row.last_heartbeat)).total_seconds()
    delta = data.position - row.last_position
    # Stale sessions, seeking, rapid requests and paused playback earn no time.
    if 5 <= elapsed <= 30 and 0 < delta <= elapsed * 2 + 2:
        row.seconds += int(min(elapsed, delta))
    row.last_position, row.last_heartbeat = data.position, now
    policy = await configuration(db)
    if row.eligible and premium(user) and book.access_tier == "premium" and row.seconds >= policy["valid_play_seconds"]:
        exists = await db.scalar(select(EligibleView.id).where(EligibleView.user_id == user.id,
            EligibleView.audiobook_id == book.id, EligibleView.month == month_now()))
        if not exists:
            db.add(EligibleView(user_id=user.id, audiobook_id=book.id, publisher_id=book.owner_id, month=month_now()))
    await db.commit()
    return {"listened_seconds": row.seconds}

@router.post("/audiobooks/{id}/audio")
async def upload_audio(id: UUID, db: DatabaseDep, user: ActivePublisherDep, file: UploadFile = File(...)):
    from mutagen.mp3 import MP3
    from app.models import GenerationJob
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    book = await db.get(Audiobook, id)
    if not book or book.owner_id != user.id:
        raise HTTPException(404, "Audiobook not found")
    if book.publication_status == "deleted" or book.status == AudiobookStatus.COMPLETED:
        raise HTTPException(409, "Create a new audiobook version to replace existing audio")
    if await db.scalar(select(GenerationJob.id).where(GenerationJob.audiobook_id == id,
            GenerationJob.status.in_([AudiobookStatus.PENDING, AudiobookStatus.PROCESSING]), GenerationJob.cancelled.is_(False))):
        raise HTTPException(409, "Cancel active generation before uploading audio")
    if Path(file.filename or "").suffix.lower() != ".mp3":
        raise HTTPException(400, "An MP3 file is required")
    folder = Path(settings.UPLOAD_DIR) / "audio"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid.uuid4()}.mp3"
    size = 0
    try:
        with path.open("wb") as output:
            while chunk := await file.read(65536):
                size += len(chunk)
                if size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                    raise HTTPException(413, "Audio exceeds upload limit")
                output.write(chunk)
        metadata = MP3(path)
        duration = metadata.info.length
        if duration <= 0:
            raise ValueError("Empty audio")
    except Exception as exc:
        path.unlink(missing_ok=True)
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(400, "Invalid MP3 audio")
    key = f"/uploads/audio/{path.name}"
    chapter = await db.scalar(select(Chapter).where(Chapter.audiobook_id == id, Chapter.chapter_number == 1))
    if not chapter:
        chapter = Chapter(audiobook_id=id, title=book.title, chapter_number=1)
        db.add(chapter)
    chapter.audio_url, chapter.duration_seconds = key, duration
    book.audio_url, book.duration_seconds, book.status = key, duration, AudiobookStatus.COMPLETED
    await db.commit()
    return {"id": book.id, "duration_seconds": duration}
