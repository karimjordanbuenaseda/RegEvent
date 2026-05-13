from typing import Literal, Optional
from uuid import UUID
import random
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field, select

from app.database import get_session
from app.models.attendee import Attendee, TicketTier
from app.models.event import Event
from app.models.prize import Prize
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.email import send_winner_email, send_prize_revoke_email

router = APIRouter(prefix="/raffle", tags=["raffle"])

TICKET_WEIGHTS = {TicketTier.VIP: 3, TicketTier.GENERAL: 1}


class PrizeCreate(SQLModel):
    title: str = Field(description="Display name of the prize (e.g. `Grand Prize — iPhone 16`)")
    quantity: int = Field(description="Number of units available for this prize")
    draw_order: Optional[int] = Field(default=None, description="Position in the draw sequence (1 = first). Omit to append at the end.")


class PrizeUpdate(SQLModel):
    title: Optional[str] = Field(default=None, description="Updated prize title")
    quantity: Optional[int] = Field(default=None, description="Updated quantity")
    draw_order: Optional[int] = Field(default=None, description="Updated draw order position")


class DrawRequest(SQLModel):
    eligibility: Literal["checked_in", "registered", "both"] = Field(
        default="checked_in",
        description=(
            "`checked_in` — only attendees who have checked in; "
            "`registered` — all registered attendees; "
            "`both` — same as `registered` (alias)"
        ),
    )
    prize_id: Optional[UUID] = Field(default=None, description="UUID of the prize being drawn. If provided, the prize title is recorded on the winner.")
    include_winners: bool = Field(
        default=False,
        description="If `true`, attendees who have already won are included in the eligible pool. Defaults to `false`.",
    )


async def _get_owned_event(event_id: UUID, current_user: User, session: AsyncSession) -> Event:
    event = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return event


@router.get(
    "/{event_id}/prizes",
    response_model=list[Prize],
    summary="List prizes",
    description="Return all prizes defined for the event, ordered by `draw_order` ascending.",
    response_description="Array of prize records",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
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


@router.post(
    "/{event_id}/prizes",
    response_model=Prize,
    status_code=201,
    summary="Create prize",
    description=(
        "Add a new prize to an event's raffle. "
        "If `draw_order` is omitted the prize is appended at the end of the draw sequence."
    ),
    response_description="Newly created prize",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
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


@router.patch(
    "/{event_id}/prizes/{prize_id}",
    response_model=Prize,
    summary="Update prize",
    description="Partially update a prize's title, quantity, or draw order position.",
    response_description="Updated prize record",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Prize not found"},
    },
)
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


@router.delete(
    "/{event_id}/prizes/{prize_id}",
    status_code=204,
    summary="Delete prize",
    description="Permanently remove a prize from an event's raffle.",
    response_description="No content",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Prize not found"},
    },
)
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


@router.post(
    "/{event_id}/draw",
    response_model=Attendee,
    summary="Draw a raffle winner",
    description=(
        "Randomly select one eligible attendee as a raffle winner using ticket-tier weighting "
        "(VIP = 3×, General = 1×). "
        "The winner's record is updated with `has_won=true`, `won_at` (UTC timestamp), and `prize_title`. "
        "A winner notification email is sent as a background task. "
        "`SELECT FOR UPDATE` row-level locking prevents duplicate wins under concurrent draw requests."
    ),
    response_description="The winning attendee record with `has_won=true`",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
        409: {"description": "No eligible attendees available for this draw"},
    },
)
async def draw_winner(
    event_id: UUID,
    payload: DrawRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = await _get_owned_event(event_id, current_user, session)

    prize_title: str | None = None
    if payload.prize_id:
        prize = (await session.execute(
            select(Prize).where(Prize.id == payload.prize_id, Prize.event_id == event_id)
        )).scalars().first()
        if prize:
            prize_title = prize.title

    # Lock eligible rows within the already-active transaction (autobegin).
    # session.begin() must NOT be called here — a transaction is already open
    # from the earlier queries (_get_owned_event, prize lookup).
    where_clauses = [Attendee.event_id == event_id]
    if not payload.include_winners:
        where_clauses.append(Attendee.has_won == False)  # noqa: E712
    if payload.eligibility == "checked_in":
        where_clauses.append(Attendee.check_in_status == True)  # noqa: E712

    result = await session.execute(
        select(Attendee).where(*where_clauses).with_for_update()
    )
    eligible = result.scalars().all()

    if not eligible:
        raise HTTPException(status_code=409, detail="No eligible attendees for draw")

    weights = [TICKET_WEIGHTS[a.ticket_tier] for a in eligible]
    winner = random.choices(eligible, weights=weights, k=1)[0]
    winner.has_won = True
    winner.won_at = datetime.now(timezone.utc)
    winner.prize_title = prize_title
    session.add(winner)
    await session.commit()
    await session.refresh(winner)

    background_tasks.add_task(
        send_winner_email,
        winner.email,
        winner.full_name or "",
        event.title,
        prize_title,
    )

    return winner


@router.get(
    "/{event_id}/winners",
    response_model=list[Attendee],
    summary="List winners",
    description="Return all attendees who have won a raffle for this event, ordered by most recent win first.",
    response_description="Array of winning attendee records with `has_won=true`",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Event not found"},
    },
)
async def list_winners(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _get_owned_event(event_id, current_user, session)
    result = await session.execute(
        select(Attendee)
        .where(Attendee.event_id == event_id, Attendee.has_won == True)  # noqa: E712
        .order_by(Attendee.won_at.desc())
    )
    return result.scalars().all()


@router.post(
    "/{event_id}/winners/{attendee_id}/revoke",
    response_model=Attendee,
    summary="Revoke winner",
    description=(
        "Clear the win status of an attendee (`has_won=false`, `won_at=null`, `prize_title=null`), "
        "making them eligible for future draws again. "
        "A prize revocation email is sent to the attendee as a background task."
    ),
    response_description="Updated attendee record with win status cleared",
    responses={
        403: {"description": "Authenticated user does not own this event"},
        404: {"description": "Winner not found"},
    },
)
async def revoke_winner(
    event_id: UUID,
    attendee_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    event = await _get_owned_event(event_id, current_user, session)
    attendee = (await session.execute(
        select(Attendee).where(
            Attendee.id == attendee_id,
            Attendee.event_id == event_id,
            Attendee.has_won == True,  # noqa: E712
        )
    )).scalars().first()
    if not attendee:
        raise HTTPException(status_code=404, detail="Winner not found")

    revoked_prize = attendee.prize_title
    attendee.has_won = False
    attendee.won_at = None
    attendee.prize_title = None
    session.add(attendee)
    await session.commit()
    await session.refresh(attendee)

    background_tasks.add_task(
        send_prize_revoke_email,
        attendee.email,
        attendee.full_name or "",
        event.title,
        revoked_prize,
    )

    return attendee
