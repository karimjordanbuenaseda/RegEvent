from typing import Optional
from uuid import UUID
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.database import get_session
from app.models.attendee import Attendee, TicketTier
from app.models.event import Event
from app.models.prize import Prize
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/raffle", tags=["raffle"])

TICKET_WEIGHTS = {TicketTier.VIP: 3, TicketTier.GENERAL: 1}


class PrizeCreate(SQLModel):
    title: str
    quantity: int
    draw_order: Optional[int] = None


class PrizeUpdate(SQLModel):
    title: Optional[str] = None
    quantity: Optional[int] = None
    draw_order: Optional[int] = None


async def _get_owned_event(event_id: UUID, current_user: User, session: AsyncSession) -> Event:
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return event


@router.get("/{event_id}/prizes", response_model=list[Prize])
async def list_prizes(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)
    result = await session.execute(
        select(Prize).where(Prize.event_id == event_id).order_by(Prize.draw_order)
    )
    return result.scalars().all()


@router.post("/{event_id}/prizes", response_model=Prize, status_code=201)
async def create_prize(
    event_id: UUID,
    payload: PrizeCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)

    if payload.draw_order is None:
        max_order = (await session.execute(
            select(func.max(Prize.draw_order)).where(Prize.event_id == event_id)
        )).scalar()
        draw_order = (max_order or 0) + 1
    else:
        draw_order = payload.draw_order

    prize = Prize(event_id=event_id, title=payload.title, quantity=payload.quantity, draw_order=draw_order)
    session.add(prize)
    await session.commit()
    await session.refresh(prize)
    return prize


@router.patch("/{event_id}/prizes/{prize_id}", response_model=Prize)
async def update_prize(
    event_id: UUID,
    prize_id: UUID,
    payload: PrizeUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)
    prize = (await session.execute(
        select(Prize).where(Prize.id == prize_id, Prize.event_id == event_id)
    )).scalars().first()
    if not prize:
        raise HTTPException(status_code=404, detail="Prize not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prize, key, value)
    session.add(prize)
    await session.commit()
    await session.refresh(prize)
    return prize


@router.delete("/{event_id}/prizes/{prize_id}", status_code=204)
async def delete_prize(
    event_id: UUID,
    prize_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)
    prize = (await session.execute(
        select(Prize).where(Prize.id == prize_id, Prize.event_id == event_id)
    )).scalars().first()
    if not prize:
        raise HTTPException(status_code=404, detail="Prize not found")
    await session.delete(prize)
    await session.commit()


@router.post("/{event_id}/draw", response_model=Attendee)
async def draw_winner(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)
    async with session.begin():
        # Lock eligible rows to prevent concurrent draws picking the same winner
        result = await session.execute(
            select(Attendee)
            .where(
                Attendee.event_id == event_id,
                Attendee.check_in_status == True,  # noqa: E712
                Attendee.has_won == False,  # noqa: E712
            )
            .with_for_update()
        )
        eligible = result.scalars().all()

        if not eligible:
            raise HTTPException(status_code=409, detail="No eligible attendees for draw")

        weights = [TICKET_WEIGHTS[a.ticket_tier] for a in eligible]
        winner = random.choices(eligible, weights=weights, k=1)[0]
        winner.has_won = True

    await session.refresh(winner)
    return winner
