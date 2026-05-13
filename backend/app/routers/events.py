from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import field_validator
from sqlalchemy import delete as sa_delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field, select, or_

from app.database import get_session
from app.models.attendee import Attendee
from app.models.event import Event, EventWithStats
from app.models.event_layout import EventLayout
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.email import send_cancellation_email

router = APIRouter(prefix="/events", tags=["events"])


class EventCreate(SQLModel):
    title: str = Field(description="Display name for the event")
    slug: str = Field(description="URL-safe identifier used in event URLs (e.g. `my-event-2026`)")
    start_date: datetime = Field(description="Event start date and time (ISO 8601)")
    is_active: bool = Field(default=True, description="Whether the event is publicly visible and accepting registrations")
    latitude: Optional[float] = Field(default=None, description="Venue latitude coordinate")
    longitude: Optional[float] = Field(default=None, description="Venue longitude coordinate")

    @field_validator('start_date', mode='after')
    @classmethod
    def strip_tz(cls, v: datetime) -> datetime:
        return v.replace(tzinfo=None) if v.tzinfo else v


class EventUpdate(SQLModel):
    title: Optional[str] = Field(default=None, description="Display name for the event")
    slug: Optional[str] = Field(default=None, description="URL-safe identifier used in event URLs")
    start_date: Optional[datetime] = Field(default=None, description="Event start date and time (ISO 8601)")
    is_active: Optional[bool] = Field(default=None, description="Whether the event is publicly visible")
    latitude: Optional[float] = Field(default=None, description="Venue latitude coordinate")
    longitude: Optional[float] = Field(default=None, description="Venue longitude coordinate")

    @field_validator('start_date', mode='after')
    @classmethod
    def strip_tz(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return v
        return v.replace(tzinfo=None) if v.tzinfo else v


@router.get(
    "/me",
    response_model=list[EventWithStats],
    summary="My events",
    description=(
        "List all events owned by the current user, enriched with aggregated stats: "
        "total registered attendees, check-in count, cover image URL, and brand colors. "
        "Results are ordered by start date descending. Admins see all events."
    ),
    response_description="Array of events with attendee stats and branding metadata",
    responses={
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
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


@router.get(
    "/",
    response_model=list[Event],
    summary="List all events",
    description="Public endpoint — returns all events regardless of owner or active status.",
    response_description="Array of all event records",
)
async def list_events(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event))
    return result.scalars().all()


@router.get(
    "/{slug}",
    response_model=Event,
    summary="Get event by slug",
    description="Public endpoint — retrieve a single event matched by its URL slug.",
    response_description="Event record",
    responses={
        404: {"description": "No event found with the given slug"},
    },
)
async def get_event(slug: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Event).where(Event.slug == slug))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post(
    "/",
    response_model=Event,
    status_code=201,
    summary="Create event",
    description="Create a new event owned by the currently authenticated user.",
    response_description="The newly created event record",
    responses={
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
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


@router.patch(
    "/{event_id}",
    response_model=Event,
    summary="Update event",
    description="Partially update an event's fields. Only the event owner or an admin may update.",
    response_description="Updated event record",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
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


@router.delete(
    "/{event_id}",
    status_code=204,
    summary="Delete event",
    description=(
        "Permanently delete an event and cascade-delete all its attendees and layout. "
        "A cancellation email is sent to every previously registered attendee as a background task. "
        "Only the event owner or an admin may delete."
    ),
    response_description="No content",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
async def delete_event(
    event_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    attendees = (
        await session.execute(
            select(Attendee.email, Attendee.full_name).where(Attendee.event_id == event_id)
        )
    ).all()

    event_title = event.title
    await session.execute(sa_delete(Attendee).where(Attendee.event_id == event_id))
    await session.execute(sa_delete(EventLayout).where(EventLayout.event_id == event_id))
    await session.delete(event)
    await session.commit()

    for row in attendees:
        background_tasks.add_task(send_cancellation_email, row.email, row.full_name or "", event_title)


@router.post(
    "/{event_id}/duplicate",
    response_model=Event,
    status_code=201,
    summary="Duplicate event",
    description=(
        "Create a copy of an existing event. The duplicate gets title suffixed with `(Copy)` "
        "and a unique slug suffixed with `-copy` (or `-copy-2`, `-copy-3`, etc. if taken). "
        "The page layout is copied but attendees are not. The duplicate is inactive by default. "
        "Only the event owner or an admin may duplicate."
    ),
    response_description="The newly created duplicate event",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Source event not found"},
    },
)
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
