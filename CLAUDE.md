# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RegEvent is a mobile-first, full-stack web application with these core features:
- **Event registration** — attendees self-register or are imported
- **Check-in** — QR-code or manual lookup at the door
- **Raffle draws** — real-time, WebSocket-powered live draws
- **Event management** — create and manage events, view attendee lists, export data
- **Event landing page edits** — simple WYSIWYG editor for event pages

The entire application — frontend and backend — runs as a **single Docker container**. Vite builds the React frontend into a static bundle, which FastAPI serves via `StaticFiles`. There is no separate frontend server in production or in the standard local run.

## Architecture

```
/frontend     React 18 + Vite + TypeScript + Tailwind CSS
/backend      Python 3.10+ FastAPI + SQLModel + PostgreSQL
/docker       Multi-stage Dockerfiles and compose configs
```

- Real-time raffle uses **FastAPI WebSockets** (Starlette native) — not Socket.IO.
- Database concurrency for raffle draw integrity uses **PostgreSQL row-level locking** (`SELECT FOR UPDATE`), not application-level locking.
- UUIDs are the primary key type for events and attendees.
- Migrations are managed by **Alembic**.

## Commands

### Run (single container — primary method)

```bash
docker compose up --build
```

This builds the Vite frontend and starts FastAPI serving both the API and static bundle in one container.

### Backend (isolated development only)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Tests
pytest
pytest tests/test_events.py::test_create_event
```

### Frontend (isolated development only)

```bash
cd frontend
npm install
npm run dev        # hot-reload dev server (not used in container)
npm run build      # produces dist/ copied into Docker image
npm run test
npm run lint
```

## Conventions

### Backend

- Use **SQLModel** for models (combines Pydantic + SQLAlchemy).
- One router file per resource under `backend/app/routers/` (`events.py`, `attendees.py`, `raffle.py`).
- Use `async def` for I/O-bound endpoints; use `asyncpg` as the async PostgreSQL driver.
- Inject database sessions via `Depends(get_session)`.
- Use [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) as primary source of truth for backend related items.

### Frontend

- **Mobile-first**: design for small screens first.
- Component files use **PascalCase** (`AttendeeCard.tsx`); hooks use `use` prefix (`useRaffle.ts`).
- Tailwind utility classes only — no custom CSS files unless strictly necessary.
- Centralize API calls under `frontend/src/api/` using `fetch` or a thin Axios wrapper.
- TypeScript strict mode (`"strict": true` in `tsconfig.json`).

### Commits

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc.

## Pitfalls

- **Docker static files**: Vite's `dist/` output must be copied into the FastAPI image at the exact path FastAPI expects when mounting `StaticFiles`.
- **WebSocket scaling**: WebSocket connections require sticky sessions at the load balancer if ever scaling beyond a single container.
- **Tailwind JIT**: The `content` array in `tailwind.config.ts` must include all `.tsx`/`.ts` files or utility classes will be purged from the build.
