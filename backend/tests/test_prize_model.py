"""Tests for the Prize model — the new optional `image_url` field."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.event import Event
from app.models.prize import Prize


async def test_prize_defaults_image_url_to_none(session: AsyncSession, event: Event):
    prize = Prize(event_id=event.id, title="Grand Prize", quantity=1, draw_order=1)
    session.add(prize)
    await session.commit()
    await session.refresh(prize)

    assert prize.image_url is None


async def test_prize_persists_image_url(session: AsyncSession, event: Event):
    url = "http://minio-public.test/test-bucket/events/abc/prizes/xyz.png"
    prize = Prize(
        event_id=event.id,
        title="iPhone 16",
        quantity=1,
        draw_order=1,
        image_url=url,
    )
    session.add(prize)
    await session.commit()

    fetched = (
        await session.execute(select(Prize).where(Prize.id == prize.id))
    ).scalars().one()
    assert fetched.image_url == url


async def test_prize_image_url_can_be_updated(session: AsyncSession, event: Event):
    prize = Prize(event_id=event.id, title="Runner-up", quantity=2, draw_order=2)
    session.add(prize)
    await session.commit()
    await session.refresh(prize)
    assert prize.image_url is None

    prize.image_url = "http://minio-public.test/test-bucket/events/x/prizes/y.jpg"
    session.add(prize)
    await session.commit()
    await session.refresh(prize)

    assert prize.image_url.endswith("/y.jpg")
