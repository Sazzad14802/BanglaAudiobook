"""
Audiobook CRUD, visibility transitions, and discovery tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.audiobook import Audiobook, AudiobookStatus, AudiobookVisibility


@pytest.mark.asyncio
async def test_audiobook_crud_and_ownership(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # 1. Create Audiobook as owner
    create_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={
            "title": "Gitanjali",
            "author": "Rabindranath Tagore",
            "description": "A collection of poetry",
            "language": "bn",
            "visibility": "PRIVATE",
        },
    )
    assert create_res.status_code == 201
    book = create_res.json()
    book_id = book["id"]
    assert book["title"] == "Gitanjali"
    assert book["visibility"] == "PRIVATE"
    assert book["status"] == "PENDING"

    # 2. Owner can read their private book
    get_res = await client.get(f"/api/v1/audiobooks/{book_id}", headers=owner_headers)
    assert get_res.status_code == 200

    # 3. Other user cannot read private book -> 404
    other_get = await client.get(f"/api/v1/audiobooks/{book_id}", headers=other_headers)
    assert other_get.status_code == 404

    # 4. Anonymous cannot read private book -> 404
    anon_get = await client.get(f"/api/v1/audiobooks/{book_id}")
    assert anon_get.status_code == 404

    # 5. Non-owner cannot update metadata -> 403
    bad_update = await client.patch(
        f"/api/v1/audiobooks/{book_id}",
        headers=other_headers,
        json={"title": "Hacked Title"},
    )
    assert bad_update.status_code == 403

    # 6. Owner can update metadata -> 200
    good_update = await client.patch(
        f"/api/v1/audiobooks/{book_id}",
        headers=owner_headers,
        json={"title": "Gitanjali - Song Offerings"},
    )
    assert good_update.status_code == 200
    assert good_update.json()["title"] == "Gitanjali - Song Offerings"

    # 7. Non-owner cannot change visibility -> 403
    bad_vis = await client.patch(
        f"/api/v1/audiobooks/{book_id}/visibility",
        headers=other_headers,
        json={"visibility": "PUBLIC"},
    )
    assert bad_vis.status_code == 403

    # 8. Owner can change visibility to PUBLIC -> 200
    good_vis = await client.patch(
        f"/api/v1/audiobooks/{book_id}/visibility",
        headers=owner_headers,
        json={"visibility": "PUBLIC"},
    )
    assert good_vis.status_code == 200
    assert good_vis.json()["visibility"] == "PUBLIC"

    # 9. Non-owner cannot delete audiobook -> 403
    bad_del = await client.delete(f"/api/v1/audiobooks/{book_id}", headers=other_headers)
    assert bad_del.status_code == 403

    # 10. Owner can delete audiobook -> 204
    del_res = await client.delete(f"/api/v1/audiobooks/{book_id}", headers=owner_headers)
    assert del_res.status_code == 204

    # 11. Verify deleted
    verify_del = await client.get(f"/api/v1/audiobooks/{book_id}", headers=owner_headers)
    assert verify_del.status_code == 404


@pytest.mark.asyncio
async def test_visibility_and_public_discovery(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
    db_session: AsyncSession,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # Create a private audiobook
    book_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={
            "title": "Private Secret Book",
            "author": "Secret Author",
            "visibility": "PRIVATE",
        },
    )
    book_id = book_res.json()["id"]

    # Verify discovery DOES NOT include private book
    disc_1 = await client.get("/api/v1/audiobooks")
    assert disc_1.status_code == 200
    assert not any(item["id"] == book_id for item in disc_1.json()["items"])

    # Make book PUBLIC, but status is still PENDING
    await client.patch(
        f"/api/v1/audiobooks/{book_id}/visibility",
        headers=owner_headers,
        json={"visibility": "PUBLIC"},
    )

    # In discovery: should STILL NOT appear because status is PENDING (not COMPLETED)
    disc_2 = await client.get("/api/v1/audiobooks")
    assert not any(item["id"] == book_id for item in disc_2.json()["items"])

    # Non-owner requesting details when status is PENDING -> 404
    other_req = await client.get(f"/api/v1/audiobooks/{book_id}", headers=other_headers)
    assert other_req.status_code == 404

    # Now simulate generation completion in DB (status -> COMPLETED)
    await db_session.execute(
        update(Audiobook)
        .where(Audiobook.id == uuid.UUID(book_id))
        .values(status=AudiobookStatus.COMPLETED)
    )
    await db_session.commit()

    # In discovery: should NOW appear!
    disc_3 = await client.get("/api/v1/audiobooks")
    assert any(item["id"] == book_id for item in disc_3.json()["items"])

    # Non-owner can now view details
    other_view = await client.get(f"/api/v1/audiobooks/{book_id}", headers=other_headers)
    assert other_view.status_code == 200
    assert other_view.json()["id"] == book_id

    # Now owner turns it back to PRIVATE
    await client.patch(
        f"/api/v1/audiobooks/{book_id}/visibility",
        headers=owner_headers,
        json={"visibility": "PRIVATE"},
    )

    # Immediately blocked from discovery
    disc_4 = await client.get("/api/v1/audiobooks")
    assert not any(item["id"] == book_id for item in disc_4.json()["items"])

    # Immediately blocked from non-owner direct access
    other_blocked = await client.get(f"/api/v1/audiobooks/{book_id}", headers=other_headers)
    assert other_blocked.status_code == 404
