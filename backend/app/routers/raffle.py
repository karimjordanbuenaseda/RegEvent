from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlmodel import select
from app.database import get_session
from app.models.attendee import Attendee, TicketTier
from app.models.prize import Prize
import random

router = APIRouter(prefix="/raffle", tags=["raffle"])

TICKET_WEIGHTS = {TicketTier.VIP: 3, TicketTier.GENERAL: 1}


@router.post("/{event_id}/draw", response_model=Attendee)
async def draw_winner(event_id: UUID, session: AsyncSession = Depends(get_session)):
    async with session.begin():
        # Lock eligible rows to prevent concurrent draws picking the same winner
        result = await session.execute(
            select(Attendee)
            .where(
                Attendee.event_id == event_id,
                Attendee.check_in_status == True,
                Attendee.has_won == False,
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
