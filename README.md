# RegEvent

A mobile-first, full-stack web application for event registration, attendee check-in, and real-time raffle draws.

## Features

- **Event management** — create events, customize landing pages, and manage attendee lists
- **Self-registration** — attendees register via a public event page and receive a check-in email with a personalized link
- **Check-in** — scan a QR code or look up attendees manually at the door
- **Live raffle draws** — real-time WebSocket-powered draws with weighted ticket tiers (VIP gets 3× the chance)
- **Dashboard** — per-user metrics, live event counts, and a paginated activity feed (registrations, check-ins, and revocations)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State management | Zustand, TanStack Query |
| Backend | Python 3.12, FastAPI, SQLModel |
| Database | PostgreSQL (async via asyncpg) |
| Object storage | MinIO (S3-compatible, for event cover images) |
| Auth | JWT (HS256, 8-hour expiry), bcrypt passwords |
| Migrations | Alembic |
| Dev email | Mailpit (local SMTP catch-all) |
| Containerization | Docker Compose (5 services) |

---

## Project Structure

```
/backend          FastAPI application
  app/
    routers/      One file per resource (events, attendees, raffle, …)
    models/       SQLModel table definitions
    services/     Email (aiosmtplib) and storage (MinIO) helpers
  alembic/        Migration scripts
  seed.py         Idempotent dev-data seeder

/frontend         Vite + React application
  src/
    api/          Centralized fetch/Axios wrappers
    components/   Shared UI components (PascalCase)
    pages/        Route-level page components
    store/        Zustand stores

/docker           Dockerfiles for each service
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose)
- A `.env` file in the project root (copy from `.env.example` and fill in the values)

### Run with Docker Compose (recommended)

```bash
docker compose up --build
```

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5173 | Vite dev server with HMR |
| Backend API | http://localhost:8000 | FastAPI + auto-reload |
| API docs | http://localhost:8000/docs | Swagger UI |
| MinIO console | http://localhost:9001 | Object storage admin UI |
| Mailpit | http://localhost:8025 | Catches all outbound emails in dev |

The `regevent` MinIO bucket is created automatically with a public-read policy on first startup.

### Seed development data

```bash
# Inside the running backend container
docker compose exec backend python seed.py
```

The seeder is idempotent — safe to re-run.

---

## Backend

### Running locally (without Docker)

```bash
cd backend
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### Database migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Generate a new migration after changing models
alembic revision --autogenerate -m "short description"
```

### Tests

```bash
pytest
# Run a specific test
pytest tests/test_events.py::test_create_event
```

### API overview

| Router | Prefix | Highlights |
|---|---|---|
| Auth | `/auth` | `POST /login` (OAuth2 form), `GET /me` |
| Events | `/events` | CRUD; `GET /me` returns stats joined from layout + attendees |
| Attendees | `/attendees` | Register, look up by ID, `PATCH /{id}/check-in`, `DELETE /{id}` (revoke) |
| Raffle | `/raffle` | `POST /{event_id}/draw` — row-locked weighted draw |
| Event Layouts | `/event-layouts` | CRUD for page builder structure and styles (JSONB) |
| Uploads | `/uploads` | `POST /events/{id}/cover` — image upload to MinIO (max 5 MB) |
| Stats | `/stats` | `GET /dashboard` — aggregate counts for the current user |
| Activity | `/activity` | `GET /recent` — paginated registration + check-in feed |
| Users | `/users` | CRUD; `PATCH /me`, `PATCH /me/password` |

See [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) for full model and flow details.

### Environment variables (backend)

| Variable | Description |
|---|---|
| `DATABASE_URL` | asyncpg connection string |
| `SECRET_KEY` | JWT signing secret |
| `MINIO_ENDPOINT` | Internal MinIO host (e.g., `minio:9000`) |
| `MINIO_ROOT_USER` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | MinIO secret key |
| `MINIO_PUBLIC_URL` | Public-facing MinIO URL (e.g., `http://localhost:9000`) |
| `MINIO_BUCKET` | Bucket name (default: `regevent`) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `APP_BASE_URL` | Base URL used in check-in email links |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins (default: `http://localhost:5173`) |

---

## Frontend

### Running locally (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Other scripts

```bash
npm run build   # Production build (outputs to dist/)
npm run preview # Preview the production build locally
npm run lint    # ESLint
npm run test    # Vitest
```

### Key dependencies

- **React Router v7** — client-side routing
- **Zustand** — lightweight global state (auth, events, editor, stats, activity)
- **TanStack Query** — server state and caching
- **react-qr-code** — QR code rendering for check-in links
- **Tailwind CSS v3** — utility-first styling (mobile-first)

See [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) for component and routing details.

---

## Docker Configuration

Five services are defined in `docker-compose.yml`:

| Service | Image / Dockerfile | Ports | Networks |
|---|---|---|---|
| `frontend` | `docker/Dockerfile.frontend` (Node 20 Alpine) | 5173 | `web_network` |
| `backend` | `docker/Dockerfile.backend` (Python 3.12 slim) | 8000 | `web_network`, `db_network` |
| `db` | `docker/Dockerfile.db` (PostgreSQL) | 5432 (development) | `db_network` |
| `minio` | `minio/minio:latest` | 9000, 9001 | `db_network` |
| `mailpit` | `axllent/mailpit:latest` | 1025 (SMTP), 8025 (UI) | `db_network` |

- **Backend** waits for `db` (healthcheck), `minio` (healthcheck), and `mailpit` to be ready before starting.
- **Frontend** source is bind-mounted (`./frontend:/app`) so code changes trigger HMR without rebuilding the image.
- **Backend** source is also bind-mounted (`./backend:/app`) with `--reload` enabled.
- PostgreSQL data persists in the `postgres_data` named volume; MinIO data in `minio_data`.
- Two isolated networks keep the database and storage services off the public-facing `web_network`.
