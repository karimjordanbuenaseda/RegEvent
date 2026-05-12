from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import field_validator
from sqlalchemy import delete as sa_delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select, or_

from app.database import get_session
from app.models.attendee import Attendee
from app.models.event import Event, EventWithStats
from app.models.event_layout import EventLayout
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


class EventCreate(SQLModel):
    title: str
    slug: str
    start_date: datetime
    is_active: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator('start_date', mode='after')
    @classmethod
    def strip_tz(cls, v: datetime) -> datetime:
        return v.replace(tzinfo=None) if v.tzinfo else v


class EventUpdate(SQLModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    start_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator('start_date', mode='after')
    @classmethod
    def strip_tz(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        return v.replace(tzinfo=None) if v.tzinfo else v


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
            func.max(func.jsonb_extract_path_text(EventLayout.styles, "primary")).label("primary_color"),
            func.max(func.jsonb_extract_path_text(EventLayout.styles, "accent")).label("accent_color"),
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
            primary_color=row.primary_color,
            accent_color=row.accent_color,
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
async def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = Event(owner_id=current_user.id, **payload.model_dump())
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


@router.patch("/{event_id}", response_model=Event)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await session.execute(sa_delete(Attendee).where(Attendee.event_id == event_id))
    await session.execute(sa_delete(EventLayout).where(EventLayout.event_id == event_id))
    await session.delete(event)
    await session.commit()


@router.post("/{event_id}/duplicate", response_model=Event, status_code=201)
async def duplicate_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    base_slug = f"{event.slug}-copy"
    new_slug = base_slug
    counter = 2
    while (await session.execute(select(Event).where(Event.slug == new_slug))).scalars().first():
        new_slug = f"{base_slug}-{counter}"
        counter += 1

    new_event = Event(
        owner_id=current_user.id,
        title=f"{event.title} (Copy)",
        slug=new_slug,
        latitude=event.latitude,
        longitude=event.longitude,
        is_active=False,
        start_date=event.start_date,
    )
    session.add(new_event)
    await session.flush()

    layout = (await session.execute(
        select(EventLayout).where(EventLayout.event_id == event_id)
    )).scalars().first()
    if layout:
        session.add(EventLayout(
            event_id=new_event.id,
            layout_name=layout.layout_name,
            structure=layout.structure,
            styles=layout.styles,
        ))

    await session.commit()
    await session.refresh(new_event)
    return new_event
