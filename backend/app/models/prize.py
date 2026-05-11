from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class Prize(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="event.id")
    title: str
    quantity: int
    draw_order: int
