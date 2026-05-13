import asyncio
import os
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


def _run_migrations() -> None:
    from alembic.config import Config
    from alembic import command
    cfg = Config("alembic.ini")
    command.upgrade(cfg, "head")


async def init_db() -> None:
    import app.models  # noqa: F401 — ensures all models are registered before create_all
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await asyncio.to_thread(_run_migrations)
