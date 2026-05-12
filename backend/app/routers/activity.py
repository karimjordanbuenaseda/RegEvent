from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select, or_
from app.database import get_session
from app.models.attendee import Attendee
from app.models.event import Event
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])

LIMIT = 15


class ActivityItem(SQLModel):
    type: Literal["registration", "check_in"]
    attendee_name: str
    event_title: str
    timestamp: datetime


@router.get("/recent", response_model=list[ActivityItem])
async def recent_activity(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    scope = or_(Event.owner_id == current_user.id, current_user.role == "admin")

    reg_rows = (await session.execute(
        select(Attendee.full_name, Attendee.email, Attendee.created_at, Event.title)
        .join(Event, Event.id == Attendee.event_id)
        .where(scope)
        .order_by(Attendee.created_at.desc())
        .limit(LIMIT)
    )).all()

    checkin_rows = (await session.execute(
        select(Attendee.full_name, Attendee.email, Attendee.checked_in_at, Event.title)
        .join(Event, Event.id == Attendee.event_id)
        .where(Attendee.check_in_status == True, Attendee.checked_in_at.is_not(None), scope)  # noqa: E712
        .order_by(Attendee.checked_in_at.desc())
        .limit(LIMIT)
    )).all()

    items: list[ActivityItem] = []

    for row in reg_rows:
        items.append(ActivityItem(
            type="registration",
            attendee_name=row.full_name or row.email,
            event_title=row.title,
            timestamp=row.created_at,
        ))

    for row in checkin_rows:
        items.append(ActivityItem(
            type="check_in",
            attendee_name=row.full_name or row.email,
            event_title=row.title,
            timestamp=row.checked_in_at,
        ))

    items.sort(key=lambda x: x.timestamp, reverse=True)
    return items[:20]
