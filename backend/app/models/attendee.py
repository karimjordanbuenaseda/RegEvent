import enum
from uuid import UUID, uuid4
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class TicketTier(str, enum.Enum):
    GENERAL = "General"
    VIP = "VIP"


class Attendee(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="event.id")
    full_name: Optional[str] = None
    email: str
    ticket_tier: TicketTier = TicketTier.GENERAL
    check_in_status: bool = False
    has_won: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    checked_in_at: Optional[datetime] = None
