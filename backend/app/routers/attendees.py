from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models.attendee import Attendee

router = APIRouter(prefix="/attendees", tags=["attendees"])


@router.get("/", response_model=list[Attendee])
async def list_attendees(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Attendee).where(Attendee.event_id == event_id))
    return result.scalars().all()


@router.post("/", response_model=Attendee, status_code=201)
async def register_attendee(attendee: Attendee, session: AsyncSession = Depends(get_session)):
    session.add(attendee)
    await session.commit()
    await session.refresh(attendee)
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
