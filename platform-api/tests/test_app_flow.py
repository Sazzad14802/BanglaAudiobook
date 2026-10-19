"""
Endpoints the mobile app relies on: library status, continue listening,
cover artwork, and anonymous browsing with a stale token.
"""

import uuid
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Chapter
from app.models.audiobook import Audiobook, AudiobookStatus

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


async def public_book(client: AsyncClient, owner: dict, db: AsyncSession, chapters=(100.0, 50.0)) -> str:
    response = await client.post("/api/v1/audiobooks", headers=owner["headers"],
                                 json={"title": "Public Book", "visibility": "PUBLIC", "channel_id": owner["channel_id"]})
    book_id = response.json()["id"]
    await db.execute(update(Audiobook).where(Audiobook.id == uuid.UUID(book_id))
                     .values(status=AudiobookStatus.COMPLETED))
    for number, duration in enumerate(chapters, start=1):
        db.add(Chapter(audiobook_id=uuid.UUID(book_id), title=f"Part {number}",
                       chapter_number=number, duration_seconds=duration))
    await db.commit()
    return book_id


async def test_library_status_reflects_save_and_remove(client, owner_tokens, other_tokens, db_session):
    book_id = await public_book(client, owner_tokens, db_session)
    headers = other_tokens["headers"]

    assert (await client.get(f"/api/v1/library/{book_id}", headers=headers)).json() == {"saved": False}
    assert (await client.post(f"/api/v1/library/{book_id}", headers=headers)).status_code == 201
    assert (await client.get(f"/api/v1/library/{book_id}", headers=headers)).json() == {"saved": True}
    assert (await client.delete(f"/api/v1/library/{book_id}", headers=headers)).status_code == 204
    assert (await client.get(f"/api/v1/library/{book_id}", headers=headers)).json() == {"saved": False}


async def test_library_status_hides_private_books(client, owner_tokens, other_tokens):
    private = await client.post("/api/v1/audiobooks", headers=owner_tokens["headers"],
                                json={"title": "Secret", "visibility": "PRIVATE"})
    response = await client.get(f"/api/v1/library/{private.json()['id']}", headers=other_tokens["headers"])
    assert response.status_code == 404


async def test_recent_playback_reports_overall_progress(client, owner_tokens, other_tokens, db_session):
    book_id = await public_book(client, owner_tokens, db_session)
    headers = other_tokens["headers"]
    chapters = (await client.get(f"/api/v1/audiobooks/{book_id}/chapters", headers=headers)).json()

    saved = await client.put(f"/api/v1/playback/{book_id}", headers=headers,
                             json={"chapter_id": chapters[1]["id"], "position_seconds": 20})
    assert saved.status_code == 200

    recent = (await client.get("/api/v1/playback/recent", headers=headers)).json()
    assert len(recent) == 1
    assert recent[0]["audiobook"]["id"] == book_id
    # 100s of chapter one plus 20s into chapter two, out of 150s total.
    assert recent[0]["progress_percent"] == 80.0


async def test_cover_upload_is_owner_only_and_publicly_served(client, owner_tokens, other_tokens, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    created = await client.post("/api/v1/audiobooks", headers=owner_tokens["headers"],
                                json={"title": "Covered", "visibility": "PRIVATE"})
    book_id = created.json()["id"]
    image = {"file": ("cover.png", PNG, "image/png")}

    denied = await client.post(f"/api/v1/audiobooks/{book_id}/cover", headers=other_tokens["headers"], files=image)
    assert denied.status_code == 404

    uploaded = await client.post(f"/api/v1/audiobooks/{book_id}/cover", headers=owner_tokens["headers"], files=image)
    assert uploaded.status_code == 200
    cover_url = uploaded.json()["cover_image_url"]
    assert cover_url.startswith("/api/v1/covers/") and cover_url.endswith(".png")

    served = await client.get(cover_url)
    assert served.status_code == 200
    assert served.content == PNG


async def test_cover_rejects_non_images_and_traversal(client, owner_tokens, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    created = await client.post("/api/v1/audiobooks", headers=owner_tokens["headers"],
                                json={"title": "Covered", "visibility": "PRIVATE"})
    bad = await client.post(f"/api/v1/audiobooks/{created.json()['id']}/cover", headers=owner_tokens["headers"],
                            files={"file": ("cover.png", b"%PDF-1.4 not an image", "image/png")})
    assert bad.status_code == 400
    assert (await client.get("/api/v1/covers/..%2F..%2Fsecret.png")).status_code == 404


async def test_stale_token_still_allows_public_browsing(client):
    response = await client.get("/api/v1/audiobooks", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 200
