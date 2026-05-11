from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Event(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    title: str
    slug: str = Field(unique=True, index=True)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool = True
    start_date: datetime
