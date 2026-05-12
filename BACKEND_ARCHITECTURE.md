# RegEvent: Backend Architecture & Data Design (v2.0)

This document outlines the server-side structure, featuring geographical tracking, a dedicated dynamic layout engine, MinIO-based object storage, and JWT authentication.

## 1. System Architecture
* **API Framework:** FastAPI
* **ORM:** SQLModel (Pydantic + SQLAlchemy)
* **Database:** PostgreSQL (with JSONB support)
* **Migrations:** Alembic
* **Object Storage:** MinIO (S3-compatible, for event cover images)
* **Authentication:** JWT (HS256) via `python-jose`; passwords hashed with bcrypt

---

## 2. Data Models

### A. User Model
Represents a web user who can create and manage events (event admin or creator).

**Table:** `users` (explicit name to avoid conflict with PostgreSQL's reserved word `user`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `email` | String | Unique, indexed — used for login |
| `full_name` | String | |
| `hashed_password` | String | bcrypt — never stored as plain text |
| `role` | Enum | `admin` \| `creator` (default: `creator`) |
| `is_active` | Boolean | default `True` |

**Schema classes:** `UserBase`, `UserCreate` (adds `password`), `UserPublic` (exposes `id`, omits password).

---

### B. Event Model
The core entity with geographical coordinates for map-based features.

**Table:** `event`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `owner_id` | UUID | Foreign Key → `users.id`, indexed |
| `title` | String | |
| `slug` | String | Unique, indexed — URL identifier |
| `latitude` | Float | Optional |
| `longitude` | Float | Optional |
| `is_active` | Boolean | default `True` |
| `start_date` | DateTime | Stored timezone-naive (UTC) |

**Response schema:** `EventWithStats` — extends `Event` with computed fields `total_attendees`, `checked_in_count`, `cover_image_url`, `primary_color`, `accent_color` (joined from `EventLayout`).

---

### C. EventLayout Model
Separates presentation data from business data for the dynamic page builder.

**Table:** `eventlayout`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `event_id` | UUID | Foreign Key → `event.id` |
| `layout_name` | String | e.g., `"Default"`, `"VIP Exclusive"` |
| `structure` | JSONB | Ordered list of component type strings — e.g., `["hero", "map", "raffle", "footer"]` |
| `styles` | JSONB | CSS variable overrides — e.g., `{"primary": "#81A6C6", "accent": "#AACDDC"}` |
| `cover_image_url` | String | Optional — public MinIO URL for the event cover image |

---

### D. Attendee Model
**Table:** `attendee`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `event_id` | UUID | Foreign Key → `event.id` |
| `full_name` | String | Optional |
| `email` | String | |
| `ticket_tier` | Enum | `General` (default) \| `VIP` |
| `check_in_status` | Boolean | default `False` |
| `has_won` | Boolean | default `False` |
| `created_at` | DateTime | Auto-set on creation (UTC) |
| `checked_in_at` | DateTime | Optional — set when `check_in_status` becomes `True` |

---

### E. Prize Model
**Table:** `prize`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary Key |
| `event_id` | UUID | Foreign Key → `event.id` |
| `title` | String | |
| `quantity` | Integer | |
| `draw_order` | Integer | Determines sequence of prize draws |

---

## 3. Model Connections (ERD)

* **User (1) → Event (N):** A user owns and manages one or more events (`owner_id` FK on Event).
* **Event (1) → EventLayout (N):** An event can have one active layout or multiple versioned layouts.
* **Event (1) → Attendee (N):** Standard registration relationship.
* **Event (1) → Prize (N):** Defines the prize pool for a specific event.

---

## 4. Routers

All routers are mounted in `app/main.py`. Base path prefix is defined per router.

| Router file | Prefix | Tag | Description |
|---|---|---|---|
| `auth.py` | `/auth` | `auth` | Login (OAuth2 password flow), JWT token issue, `/me` |
| `users.py` | `/users` | `users` | CRUD for users; profile update, password change |
| `events.py` | `/events` | `events` | List, create, update, delete events; `/me` for owned events |
| `event_layouts.py` | `/event-layouts` | `event-layouts` | CRUD for `EventLayout`; create, list, patch, delete |
| `attendees.py` | `/attendees` | `attendees` | Register attendees, lookup by ID, check-in patch |
| `raffle.py` | `/raffle` | `raffle` | `POST /{event_id}/draw` — atomic weighted raffle draw |
| `uploads.py` | `/uploads` | `uploads` | `POST /events/{event_id}/cover` — cover image upload to MinIO |
| `stats.py` | `/stats` | `stats` | `GET /dashboard` — aggregate counts scoped to current user |
| `activity.py` | `/activity` | `activity` | `GET /recent` — paginated feed of registrations and check-ins |

### Auth endpoints
* `POST /auth/login` — accepts `application/x-www-form-urlencoded` (OAuth2 password form); returns `{ access_token, token_type }`. Token expires in **8 hours**.
* `GET /auth/me` — returns `UserPublic` for the authenticated user.

### Events endpoints
* `GET /events/me` — returns `list[EventWithStats]` for the current user's events (admins see all). Joins `Attendee` and `EventLayout` for computed stats and style fields.
* `GET /events/` — unauthenticated list of all events.
* `GET /events/{slug}` — fetch a single event by slug.
* `POST /events/` — create event (auth required).
* `PATCH /events/{event_id}` — partial update (auth required; owner or admin only).
* `DELETE /events/{event_id}` — delete event and its layouts (auth required; owner or admin only).

### Attendees endpoints
* `GET /attendees/?event_id=<uuid>` — list all attendees for an event.
* `POST /attendees/` — register a new attendee; triggers a background check-in email via `email.py` service.
* `GET /attendees/{attendee_id}` — look up a single attendee (used for QR check-in).
* `PATCH /attendees/{attendee_id}/check-in` — sets `check_in_status = True` and records `checked_in_at`.

---

## 5. Services

### `services/email.py`
Sends transactional emails using **aiosmtplib** (async SMTP).

* `send_checkin_email(to, name, event_title, checkin_url)` — sends a styled HTML email with a "Check In Now" button after a successful registration.
* SMTP credentials and host are read from environment variables.
* Called as a FastAPI `BackgroundTask` so registration responses are not blocked.

### `services/storage.py`
Wraps the **MinIO** Python client for object storage.

* `upload_file(data, object_name, content_type) -> str` — uploads bytes to the `regevent` bucket and returns a public URL (`MINIO_PUBLIC_URL/regevent/<object_name>`).
* `delete_file(object_name)` — removes an object from the bucket (used when replacing a cover image with a different extension).
* Bucket is created with a public-read policy on first access (idempotent).
* Internal Docker access via `MINIO_ENDPOINT`; browser access via `MINIO_PUBLIC_URL` (default `http://localhost:9000`).

---

## 6. Logic Flows

### Dynamic UI Rendering
1. Frontend requests `GET /events/{slug}` to get the `Event`.
2. Frontend requests `GET /event-layouts/?event_id=<uuid>` to get the active `EventLayout`.
3. The Frontend receives `structure` (e.g., `["hero", "map", "raffle", "footer"]`) and `styles` (e.g., `{"primary": "#81A6C6"}`).
4. The React app maps the `structure` array to pre-defined TypeScript components and applies `styles` as CSS variables.

### The Raffle Transaction (Atomic)
1. **Locking:** `SELECT` attendees `FOR UPDATE` — filters for `check_in_status = True` and `has_won = False` within the same DB transaction to prevent concurrent draws picking the same winner.
2. **Weighted selection:** VIP tickets receive **3×** the weight of General tickets (`random.choices`).
3. **Commit:** Atomically marks `has_won = True` on the winner.

### Event Cover Image Upload
1. Client calls `POST /uploads/events/{event_id}/cover` with a multipart image (JPEG, PNG, WebP, or GIF; max 5 MB).
2. Router validates ownership and file type/size.
3. `storage.upload_file` pushes the bytes to MinIO and returns a public URL.
4. If an `EventLayout` does not yet exist for the event, one is created with `layout_name = "Default"`.
5. `cover_image_url` on the layout is updated and the URL is returned.