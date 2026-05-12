from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import events, attendees, raffle, event_layouts, users, auth, stats, activity


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="RegEvent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stats.router)
app.include_router(activity.router)
app.include_router(users.router)
app.include_router(events.router)
app.include_router(event_layouts.router)
app.include_router(attendees.router)
app.include_router(raffle.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
