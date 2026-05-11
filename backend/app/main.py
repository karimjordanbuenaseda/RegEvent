from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import init_db
from app.routers import events, attendees, raffle, event_layouts, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="RegEvent API", lifespan=lifespan)

app.include_router(users.router)
app.include_router(events.router)
app.include_router(event_layouts.router)
app.include_router(attendees.router)
app.include_router(raffle.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
