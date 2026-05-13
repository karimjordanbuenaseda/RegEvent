from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from app.database import get_session
from app.models.attendee import Attendee
from app.models.event import Event
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get(
    "/dashboard",
    summary="Dashboard statistics",
    description=(
        "Aggregated counts scoped to the authenticated user: active live events, "
        "total registered attendees, and total prizes awarded. "
        "Admins receive counts across all events regardless of ownership."
    ),
    response_description="Object with `total_live_events`, `total_attendees`, and `total_prizes_awarded`",
    responses={
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    role = current_user.role

    total_live_events = await session.scalar(
        select(func.count(Event.id)).where(
           Event.is_active == True,
            or_(
                role == "admin",
                Event.owner_id == current_user.id
            )
        )
    ) or 0

    total_attendees = await session.scalar(
        select(func.count(Attendee.id))
        .join(Event, Attendee.event_id == Event.id)
        .where(or_(Event.owner_id == current_user.id, role == "admin"))
    ) or 0

    total_prizes_awarded = await session.scalar(
        select(func.count(Attendee.id))
        .join(Event, Attendee.event_id == Event.id)
        .where(
            or_(
                Event.owner_id == current_user.id,
                role == "admin"
            ),
            Attendee.has_won == True,  # noqa: E712
        )
    ) or 0

    return {
        "total_live_events": total_live_events,
        "total_attendees": total_attendees,
        "total_prizes_awarded": total_prizes_awarded,
    }
