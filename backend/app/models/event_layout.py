from uuid import UUID, uuid4
from typing import Optional
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import SQLModel, Field


class EventLayout(SQLModel, table=True):
    __tablename__ = "eventlayout"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="event.id")
    layout_name: str
    # list of component type strings e.g. ["hero", "map", "raffle", "footer"]
    structure: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    # CSS variable overrides e.g. {"primary": "#81A6C6"}
    styles: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    cover_image_url: Optional[str] = None
