from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select, or_
from app.database import get_session
from app.models.attendee import Attendee
from app.models.attendee_revocation import AttendeeRevocation
from app.models.event import Event
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


class ActivityItem(SQLModel):
    type: Literal["registration", "check_in", "revocation"]
    attendee_name: str
    event_title: str
    timestamp: datetime


class ActivityPage(SQLModel):
    items: list[ActivityItem]
    has_next: bool


@router.get(
    "/recent",
    response_model=ActivityPage,
    summary="Recent activity feed",
    description=(
        "Paginated, chronologically sorted list of recent activity items across all events "
        "owned by the current user. Each item is one of: `registration` (new attendee), "
        "`check_in` (attendee checked in), or `revocation` (attendee removed). "
        "Admins see activity across all events."
    ),
    response_description="A page of activity items and a `has_next` flag indicating further pages",
    responses={
        401: {"description": "Missing, expired, or invalid Bearer token"},
    },
)
async def recent_activity(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(15, ge=1, le=50, description="Number of items per page (max 50)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    scope = or_(Event.owner_id == current_user.id, current_user.role == "admin")
    needed = page * limit + 1

    reg_rows = (await session.execute(
        select(Attendee.full_name, Attendee.email, Attendee.created_at, Event.title)
        .join(Event, Event.id == Attendee.event_id)
        .where(scope)
        .order_by(Attendee.created_at.desc())
        .limit(needed)
    )).all()

    checkin_rows = (await session.execute(
        select(Attendee.full_name, Attendee.email, Attendee.checked_in_at, Event.title)
        .join(Event, Event.id == Attendee.event_id)
        .where(Attendee.check_in_status == True, Attendee.checked_in_at.is_not(None), scope)  # noqa: E712
        .order_by(Attendee.checked_in_at.desc())
        .limit(needed)
    )).all()

    revoke_rows = (await session.execute(
        select(AttendeeRevocation.attendee_name, AttendeeRevocation.revoked_at, Event.title)
        .join(Event, Event.id == AttendeeRevocation.event_id)
        .where(scope)
        .order_by(AttendeeRevocation.revoked_at.desc())
        .limit(needed)
    )).all()

    def _utc(dt: datetime) -> datetime:
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    all_items: list[ActivityItem] = []

    for row in reg_rows:
        all_items.append(ActivityItem(
            type="registration",
            attendee_name=row.full_name or row.email,
            event_title=row.title,
            timestamp=_utc(row.created_at),
        ))

    for row in checkin_rows:
        all_items.append(ActivityItem(
            type="check_in",
            attendee_name=row.full_name or row.email,
            event_title=row.title,
            timestamp=_utc(row.checked_in_at),
        ))

    for row in revoke_rows:
        all_items.append(ActivityItem(
            type="revocation",
            attendee_name=row.attendee_name,
            event_title=row.title,
            timestamp=_utc(row.revoked_at),
        ))

    all_items.sort(key=lambda x: x.timestamp, reverse=True)

    start = (page - 1) * limit
    end = start + limit
    return ActivityPage(
        items=all_items[start:end],
        has_next=len(all_items) > end,
    )
