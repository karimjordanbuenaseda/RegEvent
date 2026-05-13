from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import SQLModel, Field


class AttendeeRevocation(SQLModel, table=True):
    __tablename__ = "attendeerevocation"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    event_id: UUID = Field(foreign_key="event.id", index=True)
    attendee_name: str
    attendee_email: str
    revoked_at: datetime = Field(default_factory=datetime.utcnow)
