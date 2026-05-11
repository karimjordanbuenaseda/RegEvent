# Regeent: Backend Architecture & Data Design (v2.0)

This document outlines the updated server-side structure, featuring geographical tracking and a dedicated dynamic layout engine.

## 1. System Architecture
* **API Framework:** FastAPI 
* **ORM:** SQLModel
* **Database:** PostgreSQL (with JSONB support)
* **Migrations:** Alembic

## 2. Data Models

### A. User Model
Represents a web user who can create and manage events (event admin or creator).
* `id`: UUID (Primary Key)
* `email`: String (Unique, indexed — used for login)
* `full_name`: String
* `hashed_password`: String (bcrypt — never stored as plain text)
* `role`: Enum (`admin`, `creator`)
* `is_active`: Boolean

> Table name is explicitly set to `users` to avoid conflict with PostgreSQL's reserved word `user`.

### C. Event Model
The core entity, now updated with geographical coordinates.
* `id`: UUID (Primary Key)
* `owner_id`: UUID (Foreign Key -> User — the creator/admin of the event)
* `title`: String
* `slug`: String (Unique URL identifier)
* `latitude`: Float (For map-based features)
* `longitude`: Float (For map-based features)
* `is_active`: Boolean
* `start_date`: DateTime

### D. EventLayout Model
A dedicated model for the "Dynamic Page Builder" logic. This separates business data from presentation data.
* `id`: UUID (Primary Key)
* `event_id`: UUID (Foreign Key -> Event)
* `layout_name`: String (e.g., "Standard", "VIP Exclusive")
* `structure`: JSONB (Array of component types and their order)
* `styles`: JSONB (Key-value pairs for CSS variables, colors, and fonts)

### E. Attendee Model
* `id`: UUID
* `event_id`: UUID (Foreign Key -> Event)
* `email`: String
* `ticket_tier`: Enum (General, VIP)
* `check_in_status`: Boolean
* `has_won`: Boolean

### F. Prize Model
* `id`: UUID
* `event_id`: UUID (Foreign Key -> Event)
* `title`: String
* `quantity`: Integer
* `draw_order`: Integer

---

## 3. Model Connections (ERD)

* **User (1) <-> Event (N):** A user owns and manages one or more events (`owner_id` FK on Event).
* **Event (1) <-> EventLayout (1/N):** An event can have one active layout or multiple versioned layouts.
* **Event (1) <-> Attendee (N):** Standard registration relationship.
* **Event (1) <-> Prize (N):** Definition of the prize pool for a specific event.

---

## 4. Enhanced Logic Flows

### Dynamic UI Rendering
1. The Frontend requests data via `GET /events/{slug}`.
2. The Backend joins `Event` and `EventLayout`.
3. The Frontend receives the `structure` (e.g., `["hero", "map", "raffle", "footer"]`) and the `styles` (e.g., `{"primary": "#81A6C6"}`).
4. The React app maps the `structure` array to a set of pre-defined TypeScript components.

### The Raffle Transaction (Atomic)
1. **Locking:** `SELECT` attendees `FOR UPDATE` to ensure no race conditions during the draw.
2. **Selection:** Weighted random selection based on `ticket_tier`.
3. **Commit:** Atomically mark `has_won = TRUE`.