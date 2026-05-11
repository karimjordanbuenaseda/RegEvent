from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models.event_layout import EventLayout

router = APIRouter(prefix="/event-layouts", tags=["event-layouts"])


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
    layout_name: Optional[str] = None,
    structure: Optional[list] = None,
    styles: Optional[dict] = None,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(EventLayout).where(EventLayout.id == layout_id))
    layout = result.scalars().first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    if layout_name is not None:
        layout.layout_name = layout_name
    if structure is not None:
        layout.structure = structure
    if styles is not None:
        layout.styles = styles
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
