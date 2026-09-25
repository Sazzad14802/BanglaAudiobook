"""
PDF Upload and Generation Job endpoint tests.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_source_upload_and_generation_flow(
    client: AsyncClient,
    owner_tokens: dict,
    other_tokens: dict,
):
    owner_headers = owner_tokens["headers"]
    other_headers = other_tokens["headers"]

    # 1. Create audiobook
    book_res = await client.post(
        "/api/v1/audiobooks",
        headers=owner_headers,
        json={"title": "Generation Book", "visibility": "PRIVATE"},
    )
    book_id = book_res.json()["id"]

    # 2. Try to generate BEFORE uploading source document -> 400
    early_gen = await client.post(
        f"/api/v1/audiobooks/{book_id}/generate",
        headers=owner_headers,
    )
    assert early_gen.status_code == 400

    # 3. Non-owner cannot upload source PDF -> 403
    fake_pdf = b"%PDF-1.4 test pdf content"
    bad_upload = await client.post(
        f"/api/v1/audiobooks/{book_id}/source",
        headers=other_headers,
        files={"file": ("test.pdf", fake_pdf, "application/pdf")},
    )
    assert bad_upload.status_code == 403

    # 4. Reject non-PDF upload -> 400
    bad_type = await client.post(
        f"/api/v1/audiobooks/{book_id}/source",
        headers=owner_headers,
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert bad_type.status_code == 400

    # 5. Owner uploads valid PDF -> 200
    upload_res = await client.post(
        f"/api/v1/audiobooks/{book_id}/source",
        headers=owner_headers,
        files={"file": ("sample.pdf", fake_pdf, "application/pdf")},
    )
    assert upload_res.status_code == 200
    updated_book = upload_res.json()
    assert updated_book["source_file_url"] is not None
    assert updated_book["source_file_url"].endswith(".pdf")

    # 6. Non-owner cannot trigger generation -> 403
    unauth_gen = await client.post(
        f"/api/v1/audiobooks/{book_id}/generate",
        headers=other_headers,
    )
    assert unauth_gen.status_code == 403

    # 7. Owner triggers generation job -> 202
    gen_res = await client.post(
        f"/api/v1/audiobooks/{book_id}/generate",
        headers=owner_headers,
    )
    assert gen_res.status_code == 202
    job_info = gen_res.json()
    assert "job_id" in job_info
    assert job_info["status"] == "PENDING"

    # 8. Non-owner cannot check generation status -> 403
    unauth_stat = await client.get(
        f"/api/v1/audiobooks/{book_id}/generation-status",
        headers=other_headers,
    )
    assert unauth_stat.status_code == 403

    # 9. Owner checks generation status -> 200
    stat_res = await client.get(
        f"/api/v1/audiobooks/{book_id}/generation-status",
        headers=owner_headers,
    )
    assert stat_res.status_code == 200
    status_body = stat_res.json()
    assert status_body["audiobook_id"] == book_id
    assert status_body["latest_job"] is not None
    assert status_body["latest_job"]["id"] == job_info["job_id"]
    assert len(status_body["history"]) >= 1
