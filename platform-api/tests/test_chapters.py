"""
Chapter endpoint and chapter authorization tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.audiobook import Audiobook, AudiobookStatus, AudiobookVisibility
from app.models.chapter import Chapter


@pytest.mark.asyncio
async def test_chapter_access_and_visibility(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
    db_session: AsyncSession,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # 1. Create audiobook (PRIVATE)
    book_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={"title": "Chapter Book", "visibility": "PRIVATE"},
    )
    book_id = book_res.json()["id"]

    # 2. Add chapters
    ch1 = Chapter(
        audiobook_id=uuid.UUID(book_id),
        title="Chapter 1: Dawn",
        chapter_number=1,
        duration_seconds=120.0,
        audio_url="/uploads/audio/ch1.mp3",
    )
    ch2 = Chapter(
        audiobook_id=uuid.UUID(book_id),
        title="Chapter 2: Dusk",
        chapter_number=2,
        duration_seconds=200.0,
        audio_url="/uploads/audio/ch2.mp3",
    )
    db_session.add_all([ch1, ch2])
    await db_session.commit()
    await db_session.refresh(ch1)
    await db_session.refresh(ch2)

    # 3. Owner can list chapters of private book -> 200
    owner_chs = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters",
        headers=owner_headers,
    )
    assert owner_chs.status_code == 200
    items = owner_chs.json()
    assert len(items) == 2
    assert items[0]["title"] == "Chapter 1: Dawn"
    assert items[1]["title"] == "Chapter 2: Dusk"

    # 4. Owner can get specific chapter -> 200
    owner_ch1 = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters/{ch1.id}",
        headers=owner_headers,
    )
    assert owner_ch1.status_code == 200
    assert owner_ch1.json()["chapter_number"] == 1

    # 5. Non-owner cannot list chapters of private book -> 404
    other_chs = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters",
        headers=other_headers,
    )
    assert other_chs.status_code == 404

    # 6. Non-owner cannot get chapter of private book -> 404
    other_ch1 = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters/{ch1.id}",
        headers=other_headers,
    )
    assert other_ch1.status_code == 404

    # 7. Make book PUBLIC and COMPLETED
    await db_session.execute(
        update(Audiobook)
        .where(Audiobook.id == uuid.UUID(book_id))
        .values(
            visibility=AudiobookVisibility.PUBLIC,
            status=AudiobookStatus.COMPLETED,
        )
    )
    await db_session.commit()

    # 8. Non-owner can now list chapters -> 200
    other_chs_pub = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters",
        headers=other_headers,
    )
    assert other_chs_pub.status_code == 200
    assert len(other_chs_pub.json()) == 2

    # 9. Non-owner can get chapter details -> 200
    other_ch_pub = await client.get(
        f"/api/v1/audiobooks/{book_id}/chapters/{ch1.id}",
        headers=other_headers,
    )
    assert other_ch_pub.status_code == 200
    assert other_ch_pub.json()["id"] == str(ch1.id)
