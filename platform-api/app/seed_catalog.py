"""
Seed the public catalog with public-domain works narrated by the TTS service.

    python -m app.seed_catalog            # create/complete the catalog
    python -m app.seed_catalog --dry-run  # show what would change

Content lives in seed/catalog.json (public-domain texts). Every chapter's audio is
synthesized by the running TTS service (Gemini, with its fallbacks), so the data
is real narration, not placeholders. The script is idempotent: finished chapters
are skipped, so it can be re-run after a rate limit or a failure.

Books from the old demo seed whose audio points at a placeholder URL are retired
(soft-deleted, recoverable) so they no longer appear in the catalog.
"""

import argparse
import asyncio
import io
import json
import secrets
import uuid
import wave
from pathlib import Path

import httpx
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models import Audiobook, AudiobookStatus, AudiobookVisibility, Chapter, User
from app.models.platform import Channel

CATALOG = Path(__file__).resolve().parents[1] / "seed" / "catalog.json"
PLACEHOLDER_AUDIO = "%actions.google.com%"


async def synthesize(client: httpx.AsyncClient, text: str, language: str) -> bytes:
    """Call the TTS service, retrying transient failures with backoff."""
    for attempt in range(4):
        try:
            response = await client.post(settings.TTS_GENERATE_URL, json={"text": text, "language": language})
            if response.status_code < 500:
                response.raise_for_status()
                return response.content
            detail = response.text[:200]
        except httpx.HTTPError as exc:
            detail = str(exc)
        wait = 15 * (attempt + 1)
        print(f"    TTS unavailable ({detail}); retrying in {wait}s")
        await asyncio.sleep(wait)
    raise RuntimeError("TTS service kept failing; re-run the script later")


def wav_seconds(data: bytes) -> float:
    with wave.open(io.BytesIO(data), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


async def ensure_publisher(db, spec: dict) -> User:
    user = await db.scalar(select(User).where(User.email == spec["email"]))
    if not user:
        password = secrets.token_urlsafe(12)
        user = User(email=spec["email"], username=spec["username"], password_hash=hash_password(password),
                    account_type="user", full_name=spec["full_name"], publisher_status="active")
        db.add(user)
        await db.flush()
        print(f"Created publisher {spec['email']} (password: {password})")
    user.publisher_status, user.suspended = "active", False
    user.full_name = user.full_name or spec["full_name"]
    return user


async def ensure_channel(db, owner: User, spec: dict) -> Channel:
    channel = await db.scalar(select(Channel).where(Channel.owner_id == owner.id, Channel.name == spec["name"]))
    if not channel:
        channel = Channel(owner_id=owner.id, name=spec["name"], description=spec["description"])
        db.add(channel)
        await db.flush()
    return channel


async def retire_placeholders(db, dry_run: bool) -> int:
    ids = (await db.scalars(select(Chapter.audiobook_id).where(Chapter.audio_url.like(PLACEHOLDER_AUDIO)).distinct())).all()
    if ids and not dry_run:
        await db.execute(update(Audiobook).where(Audiobook.id.in_(ids)).values(
            publication_status="deleted", visibility=AudiobookVisibility.PRIVATE))
    return len(ids)


async def seed(dry_run: bool) -> None:
    spec = json.loads(CATALOG.read_text(encoding="utf-8"))
    audio_dir = Path(settings.UPLOAD_DIR) / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    async with async_session_maker() as db, httpx.AsyncClient(
            timeout=300, headers={"X-Service-Key": settings.TTS_SERVICE_KEY}) as client:
        retired = await retire_placeholders(db, dry_run)
        print(f"Placeholder books retired: {retired}")
        if dry_run:
            for book in spec["books"]:
                print(f"Would seed: {book['title']} ({len(book['chapters'])} chapters)")
            return

        publisher = await ensure_publisher(db, spec["publisher"])
        channel = await ensure_channel(db, publisher, spec["publisher"]["channel"])
        await db.commit()

        for entry in spec["books"]:
            book = await db.scalar(select(Audiobook).where(
                Audiobook.owner_id == publisher.id, Audiobook.title == entry["title"],
                Audiobook.publication_status != "deleted"))
            if not book:
                book = Audiobook(owner_id=publisher.id, title=entry["title"], status=AudiobookStatus.PROCESSING)
                db.add(book)
            book.author, book.description = entry["author"], entry["description"]
            book.language, book.genre, book.access_tier = entry["language"], entry["genre"], entry["access_tier"]
            book.channel_id = channel.id
            await db.commit()
            print(f"\n{entry['title']}")

            for number, chapter_spec in enumerate(entry["chapters"], start=1):
                chapter = await db.scalar(select(Chapter).where(
                    Chapter.audiobook_id == book.id, Chapter.chapter_number == number))
                existing = Path(settings.UPLOAD_DIR) / chapter.audio_url.removeprefix("/uploads/") if chapter and chapter.audio_url else None
                if existing and existing.exists():
                    print(f"  {number}. {chapter_spec['title']} — already narrated")
                    continue
                print(f"  {number}. {chapter_spec['title']} — narrating…")
                audio = await synthesize(client, chapter_spec["text"], entry["language"])
                name = f"seed-{uuid.uuid4().hex}.wav"
                (audio_dir / name).write_bytes(audio)
                if not chapter:
                    chapter = Chapter(audiobook_id=book.id, chapter_number=number, title=chapter_spec["title"])
                    db.add(chapter)
                chapter.title = chapter_spec["title"]
                chapter.audio_url, chapter.duration_seconds = f"/uploads/audio/{name}", wav_seconds(audio)
                await db.commit()
                print(f"     {chapter.duration_seconds:.0f}s")

            chapters = (await db.scalars(select(Chapter).where(Chapter.audiobook_id == book.id))).all()
            book.duration_seconds = sum(c.duration_seconds for c in chapters)
            book.status = AudiobookStatus.COMPLETED
            book.visibility, book.publication_status = AudiobookVisibility.PUBLIC, "published"
            await db.commit()
        print("\nCatalog ready.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(seed(parser.parse_args().dry_run))
