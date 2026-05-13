from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field, select

from app.database import get_session
from app.models.event_layout import EventLayout

router = APIRouter(prefix="/event-layouts", tags=["event-layouts"])


class LayoutUpdate(SQLModel):
    layout_name: Optional[str] = Field(default=None, description="Human-readable name for this layout")
    structure: Optional[list] = Field(default=None, description="Ordered list of page section/block definitions")
    styles: Optional[dict] = Field(default=None, description="Key-value map of style tokens (e.g. `primary`, `accent` colors)")
    cover_image_url: Optional[str] = Field(default=None, description="Publicly accessible URL of the event cover image")


@router.post(
    "/",
    response_model=EventLayout,
    status_code=201,
    summary="Create layout",
    description="Create a new page layout record for an event.",
    response_description="Newly created layout",
)
async def create_layout(layout: EventLayout, session: AsyncSession = Depends(get_session)):
    session.add(layout)
    await session.commit()
    await session.refresh(layout)
    return layout


@router.get(
    "/",
    response_model=list[EventLayout],
    summary="List layouts",
    description="Return all page layouts associated with the given `event_id`.",
    response_description="Array of layout records for the event",
)
async def list_layouts(event_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(EventLayout).where(EventLayout.event_id == event_id)
    )
    return result.scalars().all()


@router.patch(
    "/{layout_id}",
    response_model=EventLayout,
    summary="Update layout",
    description="Partially update a layout's name, section structure, style tokens, or cover image URL.",
    response_description="Updated layout record",
    responses={
        404: {"description": "Layout not found"},
    },
)
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


@router.delete(
    "/{layout_id}",
    status_code=204,
    summary="Delete layout",
    description="Permanently delete a page layout by UUID.",
    response_description="No content",
    responses={
        404: {"description": "Layout not found"},
    },
)
async def delete_layout(layout_id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(EventLayout).where(EventLayout.id == layout_id))
    layout = result.scalars().first()
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    await session.delete(layout)
    await session.commit()
