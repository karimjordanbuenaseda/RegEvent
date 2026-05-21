"""Happy-path tests for /raffle endpoints — prize CRUD, public listing, and draw."""
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendee import Attendee, TicketTier
from app.models.event import Event


async def test_create_prize_with_image_url(
    client: AsyncClient, event: Event, auth_headers: dict[str, str]
):
    url = "http://minio-public.test/test-bucket/events/x/prizes/p.png"
    res = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Top Prize", "quantity": 1, "image_url": url},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "Top Prize"
    assert body["quantity"] == 1
    assert body["image_url"] == url
    assert body["draw_order"] == 1  # auto-assigned


async def test_create_prize_without_image_url_returns_null(
    client: AsyncClient, event: Event, auth_headers: dict[str, str]
):
    res = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Plain Prize", "quantity": 5},
    )
    assert res.status_code == 201
    assert res.json()["image_url"] is None


async def test_list_prizes_returns_image_url(
    client: AsyncClient, event: Event, auth_headers: dict[str, str]
):
    await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "A", "quantity": 1, "image_url": "http://img/a.png"},
    )
    await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "B", "quantity": 1},
    )

    res = await client.get(f"/raffle/{event.id}/prizes", headers=auth_headers)
    assert res.status_code == 200
    prizes = res.json()
    assert len(prizes) == 2
    by_title = {p["title"]: p for p in prizes}
    assert by_title["A"]["image_url"] == "http://img/a.png"
    assert by_title["B"]["image_url"] is None


async def test_patch_prize_sets_image_url(
    client: AsyncClient, event: Event, auth_headers: dict[str, str]
):
    created = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Patchable", "quantity": 1},
    )
    prize_id = created.json()["id"]

    res = await client.patch(
        f"/raffle/{event.id}/prizes/{prize_id}",
        headers=auth_headers,
        json={"image_url": "http://img/new.png"},
    )
    assert res.status_code == 200
    assert res.json()["image_url"] == "http://img/new.png"


async def test_public_list_prizes_requires_no_auth(
    client: AsyncClient, event: Event, auth_headers: dict[str, str]
):
    await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Public 1", "quantity": 1, "image_url": "http://img/1.png"},
    )
    await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Public 2", "quantity": 2, "draw_order": 2},
    )

    # No Authorization header.
    res = await client.get(f"/raffle/public/{event.id}/prizes")
    assert res.status_code == 200
    prizes = res.json()
    assert [p["title"] for p in prizes] == ["Public 1", "Public 2"]
    assert prizes[0]["image_url"] == "http://img/1.png"
    assert prizes[1]["image_url"] is None


async def test_draw_returns_prize_image_url(
    client: AsyncClient,
    session: AsyncSession,
    event: Event,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
):
    # Stub out the winner email background task so it doesn't try SMTP.
    calls: list[tuple] = []

    async def fake_send(*args, **kwargs):
        calls.append((args, kwargs))

    monkeypatch.setattr("app.routers.raffle.send_winner_email", fake_send)

    # Create a prize with an image, and one checked-in attendee.
    prize_res = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Top", "quantity": 1, "image_url": "http://img/top.png"},
    )
    prize_id = prize_res.json()["id"]

    session.add(
        Attendee(
            event_id=event.id,
            email="attendee@example.com",
            full_name="Lucky One",
            ticket_tier=TicketTier.GENERAL,
            check_in_status=True,
        )
    )
    await session.commit()

    res = await client.post(
        f"/raffle/{event.id}/draw",
        headers=auth_headers,
        json={"eligibility": "checked_in", "prize_id": prize_id},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["has_won"] is True
    assert body["prize_title"] == "Top"
    assert body["prize_image_url"] == "http://img/top.png"
    assert body["email"] == "attendee@example.com"

    # Background task fired with the image URL.
    assert len(calls) == 1
    args, _ = calls[0]
    assert args[0] == "attendee@example.com"  # to
    assert args[3] == "Top"                     # prize_title
    assert args[4] == "http://img/top.png"      # prize_image_url


async def test_draw_without_prize_returns_null_image(
    client: AsyncClient,
    session: AsyncSession,
    event: Event,
    auth_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
):
    async def fake_send(*args, **kwargs):
        pass

    monkeypatch.setattr("app.routers.raffle.send_winner_email", fake_send)

    session.add(
        Attendee(
            event_id=event.id,
            email="solo@example.com",
            ticket_tier=TicketTier.GENERAL,
            check_in_status=True,
        )
    )
    await session.commit()

    res = await client.post(
        f"/raffle/{event.id}/draw",
        headers=auth_headers,
        json={"eligibility": "checked_in"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["has_won"] is True
    assert body["prize_title"] is None
    assert body["prize_image_url"] is None
