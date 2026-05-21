"""Pytest configuration and fixtures for the backend test suite.

Sets required environment variables before importing the app, wires the
application up to an in-memory SQLite database, and overrides the MinIO
storage helpers so upload tests don't need a real object store.
"""
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Environment must be set before any `app.*` import — auth.py reads SECRET_KEY
# at module load and database.py creates the engine from DATABASE_URL.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-do-not-use-in-prod")
os.environ.setdefault("MINIO_ENDPOINT", "localhost:9000")
os.environ.setdefault("MINIO_ROOT_USER", "test")
os.environ.setdefault("MINIO_ROOT_PASSWORD", "test")
os.environ.setdefault("MINIO_BUCKET", "test-bucket")
os.environ.setdefault("MINIO_PUBLIC_URL", "http://minio-public.test")

# Make `import app.*` work when pytest is run from any cwd.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

import app.models  # noqa: F401 — register all models on SQLModel.metadata
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# Replace Postgres-specific JSONB columns with portable JSON so the schema
# compiles on SQLite. The production schema is unchanged — this patch only
# mutates the in-memory metadata loaded for tests.
for _table in SQLModel.metadata.tables.values():
    for _col in _table.columns:
        if isinstance(_col.type, JSONB):
            _col.type = JSON()

from app.main import app
from app.database import get_session
from app.routers.auth import pwd_context
from app.models.user import User, UserRole
from app.models.event import Event


# A single in-memory SQLite engine shared across the test session. StaticPool
# keeps the same underlying connection so the in-memory DB persists between
# session checkouts.
_test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestSession = async_sessionmaker(_test_engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture(autouse=True)
async def _reset_db():
    """Drop + recreate all tables before every test for full isolation."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


async def _override_get_session():
    async with _TestSession() as session:
        yield session


app.dependency_overrides[get_session] = _override_get_session


@pytest_asyncio.fixture
async def session() -> AsyncSession:
    async with _TestSession() as s:
        yield s


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def user(session: AsyncSession) -> User:
    u = User(
        email="creator@example.com",
        full_name="Test Creator",
        role=UserRole.CREATOR,
        is_active=True,
        hashed_password=pwd_context.hash("password123"),
    )
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u


@pytest_asyncio.fixture
async def auth_headers(user: User) -> dict[str, str]:
    """Mint a real JWT for `user` so requests pass through `get_current_user`."""
    from jose import jwt
    from app.routers.auth import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HOURS

    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": str(user.id), "role": user.role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def event(session: AsyncSession, user: User) -> Event:
    ev = Event(
        owner_id=user.id,
        title="Test Event",
        slug=f"test-event-{uuid.uuid4().hex[:8]}",
        is_active=True,
        start_date=datetime.now(timezone.utc) + timedelta(days=7),
    )
    session.add(ev)
    await session.commit()
    await session.refresh(ev)
    return ev


@pytest.fixture
def fake_storage(monkeypatch):
    """Replace MinIO upload/delete with in-memory equivalents and return the store."""
    store: dict[str, bytes] = {}

    def fake_upload(data: bytes, object_name: str, content_type: str) -> str:
        store[object_name] = data
        return f"http://minio-public.test/test-bucket/{object_name}"

    def fake_delete(object_name: str) -> None:
        store.pop(object_name, None)

    # Patch the names the router imported (not the source module), since
    # `from app.services.storage import upload_file, delete_file` binds them
    # into app.routers.uploads at import time.
    monkeypatch.setattr("app.routers.uploads.upload_file", fake_upload)
    monkeypatch.setattr("app.routers.uploads.delete_file", fake_delete)
    return store
