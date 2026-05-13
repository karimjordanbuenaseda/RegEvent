import os
from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field, select

from app.database import get_session
from app.models.attendee import Attendee, TicketTier
from app.models.attendee_revocation import AttendeeRevocation
from app.models.event import Event
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.email import send_checkin_email, send_revoke_email

router = APIRouter(prefix="/attendees", tags=["attendees"])


class AttendeeCreate(SQLModel):
    event_id: UUID = Field(description="UUID of the event to register for")
    email: str = Field(description="Attendee's email address — used for the check-in link and notifications")
    full_name: Optional[str] = Field(default=None, description="Attendee's display name")
    ticket_tier: TicketTier = Field(default=TicketTier.GENERAL, description="Ticket tier: `General` (1× raffle weight) or `VIP` (3× raffle weight)")


@router.get(
    "/",
    response_model=list[Attendee],
    summary="List attendees",
    description="Return all attendees registered for the event specified by the `event_id` query parameter.",
    response_description="Array of attendee records for the event",
)
async def list_attendees(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.event_id == event_id))
    return result.scalars().all()


@router.post(
    "/",
    response_model=Attendee,
    status_code=201,
    summary="Register attendee",
    description=(
        "Public endpoint — register a new attendee for an event. "
        "A check-in link containing the attendee's UUID is sent to their email as a background task."
    ),
    response_description="Newly created attendee record with a generated UUID",
)
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


@router.get(
    "/{attendee_id}",
    response_model=Attendee,
    summary="Get attendee",
    description="Retrieve a single attendee record by their UUID.",
    response_description="Attendee record",
    responses={
        404: {"description": "Attendee not found"},
    },
)
async def get_attendee(attendee_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.id == attendee_id))
    attendee = result.scalars().first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    return attendee


@router.patch(
    "/{attendee_id}/check-in",
    response_model=Attendee,
    summary="Check in attendee",
    description="Mark an attendee as checked in (`check_in_status=true`) and record the current UTC timestamp in `checked_in_at`.",
    response_description="Updated attendee record with `check_in_status=true`",
    responses={
        404: {"description": "Attendee not found"},
    },
)
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


@router.delete(
    "/{attendee_id}",
    status_code=204,
    summary="Revoke attendee",
    description=(
        "Remove an attendee from an event. The revocation is recorded for the activity feed. "
        "A removal notification email is sent as a background task. "
        "Only the event owner or an admin may revoke."
    ),
    response_description="No content",
    responses={
        403: {"description": "Authenticated user does not own the event this attendee belongs to"},
        404: {"description": "Attendee not found"},
    },
)
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

    session.add(AttendeeRevocation(
        event_id=attendee.event_id,
        attendee_name=name or email,
        attendee_email=email,
    ))
    await session.delete(attendee)
    await session.commit()

    background_tasks.add_task(send_revoke_email, to=email, name=name, event_title=event_title)
