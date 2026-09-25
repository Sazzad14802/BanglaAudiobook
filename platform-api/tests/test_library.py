"""
Personal Library endpoint tests.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models.audiobook import Audiobook, AudiobookStatus, AudiobookVisibility


@pytest.mark.asyncio
async def test_library_operations(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
    db_session: AsyncSession,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # 1. Create a public, completed book
    book_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={
            "title": "Public Book",
            "author": "Public Author",
            "visibility": "PUBLIC",
        },
    )
    public_book_id = book_res.json()["id"]

    # Set status to COMPLETED
    await db_session.execute(
        update(Audiobook)
        .where(Audiobook.id == uuid.UUID(public_book_id))
        .values(status=AudiobookStatus.COMPLETED)
    )
    await db_session.commit()

    # 2. Create a private book
    priv_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={
            "title": "Private Book",
            "visibility": "PRIVATE",
        },
    )
    priv_book_id = priv_res.json()["id"]

    # 3. Other user adds PUBLIC book to library -> 201
    add_res = await client.post(
        f"/api/v1/library/{public_book_id}",
        headers=other_headers,
    )
    assert add_res.status_code == 201
    lib_item = add_res.json()
    assert lib_item["audiobook_id"] == public_book_id
    assert lib_item["audiobook"]["title"] == "Public Book"

    # 4. Other user cannot add PRIVATE book to library -> 404
    priv_add = await client.post(
        f"/api/v1/library/{priv_book_id}",
        headers=other_headers,
    )
    assert priv_add.status_code == 404

    # 5. Duplicate prevention -> 409
    dup_add = await client.post(
        f"/api/v1/library/{public_book_id}",
        headers=other_headers,
    )
    assert dup_add.status_code == 409

    # 6. View user's library -> contains the added book
    lib_list = await client.get("/api/v1/library", headers=other_headers)
    assert lib_list.status_code == 200
    items = lib_list.json()["items"]
    assert len(items) == 1
    assert items[0]["audiobook_id"] == public_book_id

    # 7. Owner's library does not contain other user's saved books
    owner_lib = await client.get("/api/v1/library", headers=owner_headers)
    assert owner_lib.status_code == 200
    assert len(owner_lib.json()["items"]) == 0

    # 8. Remove from library -> 204
    del_lib = await client.delete(
        f"/api/v1/library/{public_book_id}",
        headers=other_headers,
    )
    assert del_lib.status_code == 204

    # 9. Verify library is now empty
    lib_empty = await client.get("/api/v1/library", headers=other_headers)
    assert len(lib_empty.json()["items"]) == 0
