"""Happy-path tests for /uploads endpoints — event cover and prize image."""
import io
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.event import Event
from app.models.event_layout import EventLayout
from app.models.prize import Prize


def _png_bytes() -> bytes:
    # Minimal 1×1 transparent PNG so content_type="image/png" is plausible.
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
        "0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
    )


async def test_upload_event_cover_returns_url_and_saves_layout(
    client: AsyncClient,
    session: AsyncSession,
    event: Event,
    auth_headers: dict[str, str],
    fake_storage: dict,
):
    files = {"file": ("cover.png", io.BytesIO(_png_bytes()), "image/png")}
    res = await client.post(
        f"/uploads/events/{event.id}/cover",
        headers=auth_headers,
        files=files,
    )
    assert res.status_code == 200, res.text
    url = res.json()["url"]
    assert url.endswith(f"events/{event.id}/cover.png")

    # MinIO fake captured the upload.
    assert f"events/{event.id}/cover.png" in fake_storage

    # Layout record was created and tracks the URL.
    layout = (
        await session.execute(select(EventLayout).where(EventLayout.event_id == event.id))
    ).scalars().first()
    assert layout is not None
    assert layout.cover_image_url == url


async def test_upload_prize_image_returns_url_and_updates_prize(
    client: AsyncClient,
    session: AsyncSession,
    event: Event,
    auth_headers: dict[str, str],
    fake_storage: dict,
):
    # First create a prize.
    prize_res = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Camera", "quantity": 1},
    )
    prize_id = prize_res.json()["id"]
    assert prize_res.json()["image_url"] is None

    files = {"file": ("prize.png", io.BytesIO(_png_bytes()), "image/png")}
    res = await client.post(
        f"/uploads/prizes/{event.id}/{prize_id}/image",
        headers=auth_headers,
        files=files,
    )
    assert res.status_code == 200, res.text
    url = res.json()["url"]
    assert url.endswith(f"events/{event.id}/prizes/{prize_id}.png")

    # The fake storage saw the upload.
    assert f"events/{event.id}/prizes/{prize_id}.png" in fake_storage

    # Prize record now has the image URL.
    prize = (
        await session.execute(select(Prize).where(Prize.id == UUID(prize_id)))
    ).scalars().one()
    assert prize.image_url == url


async def test_upload_prize_image_replaces_old_extension(
    client: AsyncClient,
    session: AsyncSession,
    event: Event,
    auth_headers: dict[str, str],
    fake_storage: dict,
):
    prize_res = await client.post(
        f"/raffle/{event.id}/prizes",
        headers=auth_headers,
        json={"title": "Replaceable", "quantity": 1},
    )
    prize_id = prize_res.json()["id"]

    # Upload PNG first.
    await client.post(
        f"/uploads/prizes/{event.id}/{prize_id}/image",
        headers=auth_headers,
        files={"file": ("a.png", io.BytesIO(_png_bytes()), "image/png")},
    )
    assert f"events/{event.id}/prizes/{prize_id}.png" in fake_storage

    # Replace with a JPEG.
    res = await client.post(
        f"/uploads/prizes/{event.id}/{prize_id}/image",
        headers=auth_headers,
        files={"file": ("a.jpg", io.BytesIO(b"jpeg-bytes"), "image/jpeg")},
    )
    assert res.status_code == 200
    assert res.json()["url"].endswith(".jpg")

    # Old .png object was deleted, new .jpg present.
    assert f"events/{event.id}/prizes/{prize_id}.png" not in fake_storage
    assert f"events/{event.id}/prizes/{prize_id}.jpg" in fake_storage

    prize = (
        await session.execute(select(Prize).where(Prize.id == UUID(prize_id)))
    ).scalars().one()
    assert prize.image_url.endswith(".jpg")
