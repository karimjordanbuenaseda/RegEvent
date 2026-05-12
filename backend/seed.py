import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from uuid import UUID

from dotenv import load_dotenv
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import app.models  # noqa: F401 — registers all table models before any DB calls
from app.models.attendee import Attendee, TicketTier
from app.models.event import Event
from app.models.prize import Prize
from app.models.user import User, UserRole

load_dotenv()

DATA_DIR = Path(__file__).parent / "data" / "init"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    users_raw = json.loads((DATA_DIR / "users.json").read_text())
    events_raw = json.loads((DATA_DIR / "events.json").read_text())
    prizes_raw = json.loads((DATA_DIR / "prizes.json").read_text())
    attendees_raw = json.loads((DATA_DIR / "attendees.json").read_text())

    async with session_factory() as session:
        inserted = sum([
            await _seed_users(session, users_raw),
            await _seed_events(session, events_raw),
            await _seed_prizes(session, prizes_raw),
            await _seed_attendees(session, attendees_raw),
        ])

    await engine.dispose()
    print(f"Done. {inserted} records inserted.")


async def _seed_users(session, rows: list) -> int:
    count = 0
    for row in rows:
        if not await session.get(User, UUID(row["id"])):
            session.add(User(
                id=UUID(row["id"]),
                email=row["email"],
                full_name=row["full_name"],
                role=UserRole(row["role"]),
                is_active=row.get("is_active", True),
                hashed_password=pwd_context.hash(row["password"]),
            ))
            count += 1
    await session.commit()
    print(f"  users    : {count}/{len(rows)} inserted")
    return count


async def _seed_events(session, rows: list) -> int:
    count = 0
    for row in rows:
        if not await session.get(Event, UUID(row["id"])):
            session.add(Event(
                id=UUID(row["id"]),
                owner_id=UUID(row["owner_id"]),
                title=row["title"],
                slug=row["slug"],
                latitude=row.get("latitude"),
                longitude=row.get("longitude"),
                is_active=row.get("is_active", True),
                start_date=datetime.fromisoformat(row["start_date"]),
            ))
            count += 1
    await session.commit()
    print(f"  events   : {count}/{len(rows)} inserted")
    return count


async def _seed_prizes(session, rows: list) -> int:
    count = 0
    for row in rows:
        if not await session.get(Prize, UUID(row["id"])):
            session.add(Prize(
                id=UUID(row["id"]),
                event_id=UUID(row["event_id"]),
                title=row["title"],
                quantity=row["quantity"],
                draw_order=row["draw_order"],
            ))
            count += 1
    await session.commit()
    print(f"  prizes   : {count}/{len(rows)} inserted")
    return count


async def _seed_attendees(session, rows: list) -> int:
    count = 0
    for row in rows:
        if not await session.get(Attendee, UUID(row["id"])):
            checked_in_at = (
                datetime.fromisoformat(row["checked_in_at"])
                if row.get("checked_in_at")
                else None
            )
            session.add(Attendee(
                id=UUID(row["id"]),
                event_id=UUID(row["event_id"]),
                full_name=row.get("full_name"),
                email=row["email"],
                ticket_tier=TicketTier(row["ticket_tier"]),
                check_in_status=row.get("check_in_status", False),
                has_won=row.get("has_won", False),
                created_at=datetime.fromisoformat(row["created_at"]) if row.get("created_at") else datetime.utcnow(),
                checked_in_at=checked_in_at,
            ))
            count += 1
    await session.commit()
    print(f"  attendees: {count}/{len(rows)} inserted")
    return count


if __name__ == "__main__":
    asyncio.run(seed())
