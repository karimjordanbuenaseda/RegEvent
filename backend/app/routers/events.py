from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_
from app.database import get_session
from app.models.attendee import Attendee
from app.models.event import Event, EventWithStats
from app.models.event_layout import EventLayout
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/me", response_model=list[EventWithStats])
async def list_my_events(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    stmt = (
        select(
            Event,
            func.count(Attendee.id).label("total_attendees"),
            func.count(Attendee.id)
            .filter(Attendee.check_in_status == True)  # noqa: E712
            .label("checked_in_count"),
            func.max(EventLayout.cover_image_url).label("cover_image_url"),
        )
        .outerjoin(Attendee, Attendee.event_id == Event.id)
        .outerjoin(EventLayout, EventLayout.event_id == Event.id)
        .where(or_(Event.owner_id == current_user.id, current_user.role == "admin"))
        .group_by(Event.id)
        .order_by(Event.start_date.desc())
    )
    rows = (await session.execute(stmt)).all()
    return [
        EventWithStats(
            **row.Event.model_dump(),
            total_attendees=row.total_attendees or 0,
            checked_in_count=row.checked_in_count or 0,
            cover_image_url=row.cover_image_url,
        )
        for row in rows
    ]


@router.get("/", response_model=list[Event])
async def list_events(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event))
    return result.scalars().all()


@router.get("/{slug}", response_model=Event)
async def get_event(slug: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event).where(Event.slug == slug))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/", response_model=Event, status_code=201)
async def create_event(event: Event, session: AsyncSession = Depends(get_session)):
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
async def delete_event(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event).where(Event.id == event_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await session.delete(event)
    await session.commit()
