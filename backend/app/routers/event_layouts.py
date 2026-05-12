from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.database import get_session
from app.models.event_layout import EventLayout

router = APIRouter(prefix="/event-layouts", tags=["event-layouts"])


class LayoutUpdate(SQLModel):
    layout_name: Optional[str] = None
    structure: Optional[list] = None
    styles: Optional[dict] = None
    cover_image_url: Optional[str] = None


@router.post("/", response_model=EventLayout, status_code=201)
async def create_layout(layout: EventLayout, session: AsyncSession = Depends(get_session)):
    session.add(layout)
    await session.commit()
    await session.refresh(layout)
    return layout


@router.get("/", response_model=list[EventLayout])
async def list_layouts(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(EventLayout).where(EventLayout.event_id == event_id)
    )
    return result.scalars().all()


@router.patch("/{layout_id}", response_model=EventLayout)
async def update_layout(
    layout_id: UUID,
    payload: LayoutUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(EventLayout).where(EventLayout.id == layout_id))
    layout = result.scalars().first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(layout, key, value)
    await session.commit()
    await session.refresh(layout)
    return layout


@router.delete("/{layout_id}", status_code=204)
async def delete_layout(layout_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(EventLayout).where(EventLayout.id == layout_id))
    layout = result.scalars().first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    await session.delete(layout)
    await session.commit()
