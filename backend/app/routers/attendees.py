import os
from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.database import get_session
from app.models.attendee import Attendee, TicketTier
from app.models.event import Event
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.email import send_checkin_email, send_revoke_email

router = APIRouter(prefix="/attendees", tags=["attendees"])


class AttendeeCreate(SQLModel):
    event_id: UUID
    email: str
    full_name: Optional[str] = None
    ticket_tier: TicketTier = TicketTier.GENERAL


@router.get("/", response_model=list[Attendee])
async def list_attendees(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.event_id == event_id))
    return result.scalars().all()


@router.post("/", response_model=Attendee, status_code=201)
async def register_attendee(
    payload: AttendeeCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    attendee = Attendee(
        event_id=payload.event_id,
        email=payload.email,
        full_name=payload.full_name,
        ticket_tier=payload.ticket_tier,
    )
    session.add(attendee)
    await session.commit()
    await session.refresh(attendee)

    event = (
        await session.execute(select(Event).where(Event.id == attendee.event_id))
    ).scalars().first()

    if event:
        base_url = os.environ.get("APP_BASE_URL", "http://localhost:5173")
        checkin_url = f"{base_url}/events/{event.slug}/checkin/{attendee.id}"
        background_tasks.add_task(
            send_checkin_email,
            to=attendee.email,
            name=attendee.full_name or "",
            event_title=event.title,
            checkin_url=checkin_url,
        )

    return attendee


@router.get("/{attendee_id}", response_model=Attendee)
async def get_attendee(attendee_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = result.scalars().first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    return attendee


@router.patch("/{attendee_id}/check-in", response_model=Attendee)
async def check_in(attendee_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = result.scalars().first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    attendee.check_in_status = True
    attendee.checked_in_at = datetime.utcnow()
    await session.commit()
    await session.refresh(attendee)
    return attendee


@router.delete("/{attendee_id}", status_code=204)
async def revoke_attendee(
    attendee_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    attendee = (
        await session.execute(select(Attendee).where(Attendee.id == attendee_id))
    ).scalars().first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")

    event = (
        await session.execute(select(Event).where(Event.id == attendee.event_id))
    ).scalars().first()

    if event and event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    email = attendee.email
    name = attendee.full_name or ""
    event_title = event.title if event else "the event"

    await session.delete(attendee)
    await session.commit()

    background_tasks.add_task(send_revoke_email, to=email, name=name, event_title=event_title)
