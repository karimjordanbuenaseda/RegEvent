"""Happy-path tests for /auth endpoints."""
from httpx import AsyncClient

from app.models.user import User


async def test_login_returns_bearer_token(client: AsyncClient, user: User):
    res = await client.post(
        "/auth/login",
        data={"username": user.email, "password": "password123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and len(body["access_token"]) > 20


async def test_me_returns_authenticated_user(
    client: AsyncClient, user: User, auth_headers: dict[str, str]
):
    res = await client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == user.email
    assert body["full_name"] == user.full_name
    assert body["role"] == user.role
    assert body["id"] == str(user.id)


async def test_login_then_me_round_trip(client: AsyncClient, user: User):
    login = await client.post(
        "/auth/login",
        data={"username": user.email, "password": "password123"},
    )
    token = login.json()["access_token"]

    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == user.email
