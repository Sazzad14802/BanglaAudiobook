"""
Authentication and User endpoint tests.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register new user
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201
    user = reg_res.json()
    assert user["username"] == "alice"
    assert user["email"] == "alice@example.com"
    assert "password" not in user
    assert "password_hash" not in user

    # 2. Reject duplicate email
    dup_email = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice2",
            "email": "alice@example.com",
            "password": "Password123!",
        },
    )
    assert dup_email.status_code == 409

    # 3. Reject duplicate username
    dup_username = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice",
            "email": "different@example.com",
            "password": "Password123!",
        },
    )
    assert dup_username.status_code == 409

    # 4. Login with email
    login_email = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "alice@example.com", "password": "Password123!"},
    )
    assert login_email.status_code == 200
    token_data = login_email.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 5. Login with username
    login_user = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "alice", "password": "Password123!"},
    )
    assert login_user.status_code == 200

    # 6. Reject invalid password
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "alice", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 7. Access /api/v1/auth/me without token -> 401
    no_auth = await client.get("/api/v1/auth/me")
    assert no_auth.status_code == 401

    # 8. Access /api/v1/auth/me with valid token -> 200
    auth_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_res.status_code == 200
    assert auth_res.json()["username"] == "alice"

    # 9. Access /api/v1/users/me -> 200
    user_me = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert user_me.status_code == 200
    assert user_me.json()["username"] == "alice"
