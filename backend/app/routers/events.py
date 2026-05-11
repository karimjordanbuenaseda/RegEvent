from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models.event import Event

router = APIRouter(prefix="/events", tags=["events"])


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
