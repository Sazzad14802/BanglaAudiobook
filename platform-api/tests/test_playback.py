"""
Playback Progress endpoint tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.chapter import Chapter


@pytest.mark.asyncio
async def test_playback_progress_flow(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
    db_session: AsyncSession,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # 1. Create audiobook
    book_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={"title": "Playback Book", "visibility": "PRIVATE"},
    )
    book_id = book_res.json()["id"]

    # 2. Add chapter directly to DB
    chapter = Chapter(
        audiobook_id=uuid.UUID(book_id),
        title="Chapter 1: The Beginning",
        chapter_number=1,
        duration_seconds=360.0,
    )
    db_session.add(chapter)
    await db_session.commit()
    await db_session.refresh(chapter)

    # 3. Save playback progress as owner -> 200
    save_res = await client.put(
        f"/api/v1/playback/{book_id}",
        headers=owner_headers,
        json={"chapter_id": str(chapter.id), "position_seconds": 183.5},
    )
    assert save_res.status_code == 200
    prog = save_res.json()
    assert prog["chapter_id"] == str(chapter.id)
    assert prog["position_seconds"] == 183.5

    # 4. Retrieve saved playback progress -> 200
    get_res = await client.get(f"/api/v1/playback/{book_id}", headers=owner_headers)
    assert get_res.status_code == 200
    assert get_res.json()["position_seconds"] == 183.5

    # 5. Non-owner cannot access progress of private book -> 404
    other_get = await client.get(f"/api/v1/playback/{book_id}", headers=other_headers)
    assert other_get.status_code == 404

    # 6. Reject chapter not belonging to this audiobook -> 400
    fake_chapter_id = str(uuid.uuid4())
    bad_chapter = await client.put(
        f"/api/v1/playback/{book_id}",
        headers=owner_headers,
        json={"chapter_id": fake_chapter_id, "position_seconds": 45.0},
    )
    assert bad_chapter.status_code == 400

    # 7. Update playback progress (resume listening further) -> 200
    update_res = await client.put(
        f"/api/v1/playback/{book_id}",
        headers=owner_headers,
        json={"chapter_id": str(chapter.id), "position_seconds": 240.0},
    )
    assert update_res.status_code == 200
    assert update_res.json()["position_seconds"] == 240.0
