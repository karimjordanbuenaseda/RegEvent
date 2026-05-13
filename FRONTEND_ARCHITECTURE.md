# Main Dashboard

The Main Dashboard serves as the primary operational hub for organizers, providing immediate visibility into event performance and attendee activity.

---

## 1. Top Navigation Bar

Located at the top of the viewport, this zone provides global context and user controls.

### Features

- **Brand Identity**
  - Features the "RegEvent" logo and app name on the left.

- **Navigation Links**
  - Provides quick access to the Dashboard and user Profile.

- **Session Management**
  - Includes a Logout button to invalidate the JWT session on both client (Zustand) and server.

---

## 2. Metric Ribbon (KPI Zone)

A horizontal row of high-level statistic cards that aggregate data across the organizer's entire account.

### Metrics

- **Total Live Events**
  - Displays a count of events where `is_active` is `true`.

- **Total Attendees**
  - Summation of all records in the `Attendee` table linked to the user's events.

- **Total Prizes Awarded**
  - Count of attendees where `has_won` is `true`, providing a quick pulse on raffle progress.

---

## 3. Active Events Grid

The primary content area where individual events are managed through a card-based layout.

### Event Card Components

- **Event Header**
  - Shows the event title and a status badge (e.g., Live, Completed, Draft).

- **Check-in Progress Bar**
  - A visual representation of checked-in attendees versus total registered, crucial for monitoring event traffic.

- **Menu**
  - Delete - event could be deleted and will be treated as canceled. If the event is deleted then an email will be sent to all the attendees.
  - Duplicate - event details will be copied in a new card except for the attendees.

### Primary Action Buttons

- **Edit**
  - Navigates to the Event Editor sub-page to modify the layout or business logic.

- **Raffle Control**
  - Deep-links to the Raffle Control Center for live drawing.

- **Create New Event**
  - A prominent button to launch the event creation wizard.

---

## 4. Real-Time Activity Monitor

A vertical sidebar (or bottom drawer on mobile) that provides live updates using TanStack Query polling.

### Features

- **Timeline Feed**
  - Displays a chronological list of recent registrations and check-ins.

- **User Metadata**
  - Shows attendee names and the specific event they are interacting with.

- **Relative Time-stamps**
  - Updates like `"10 minutes ago"` to give the organizer a sense of current event momentum.

---

# Profile Sub-Page Specification

The Profile page provides a secure interface for organizers to manage their professional identity and account-wide configurations.

---

## 1. Account Identity Zone

This section handles the basic representation of the organizer.

### Features

- **Professional Details**
  - Fields for:
    - Email
    - Full Name 
    - Role

  - The bio may appear on dynamic landing pages.

- **Password Management**
  - A secure form to update credentials utilizing the backend hashing logic.

---

# Event Creation & Layout Builder

This module allows organizers to build a fully customized event landing page.

The resulting configuration is saved as an `EventLayout` record in the database, which the Schema-to-UI engine uses to render the attendee portal.

---

# 2. Visual Layout Builder (The Canvas)

This is a **What You See Is What You Get (WYSIWYG)** interface managed via Zustand for real-time responsiveness.

## Component Sidebar (The Tray)

A list of draggable components that the organizer can add to the `structure` JSONB array, including:

- Hero
- Registration Form
- Map
- Countdown

Logitude and Latitude can be provided manually but user will have the option to open google maps to extract the values from it.

## Reordering Logic

Organizers can drag and drop components to change their sequence.

This updates the index of the strings in the `EventLayout.structure` field.

## Asset Management

A dedicated zone to upload a Hero Image.

This image URL is:

- Saved into the layout configuration
- Rendered in the Dynamic Hero zone of the attendee portal

---

# 3. Theming & Customization Inspector

When a component is selected on the canvas, this sidebar opens to allow granular styling.

## Brand Color Picker

Inputs to define:

- Primary Color: `#81A6C6`
- Accent Color: `#AACDDC`

These values are saved to the `styles` JSONB object.

## Text Editor

Allows the organizer to customize:

- Labels
- Headings
- Descriptions

for each component.

# 4. Preview & Publish Logic

## Device Toggle

Allows the organizer to switch between:

- Mobile View
- Desktop View

This ensures the layout adheres to the mobile-first philosophy.

# 5. Event Attendees Visibility

- Allows users to view the attendees (registered and checked-in)
- There would be an invite form that accepts the following
  - Email
  - Full Name
- Once invite button is clicked the target will receive a registration link in the email that will have the same layout as the event created.
- Creator or Admin will have the ability to remove a attendee
  - Attendee will receive of the event cancelation

## Persistence

Clicking **Publish** triggers a TanStack Query mutation that sends the final `Event` and `EventLayout` objects to the FastAPI backend.

## Alembic Check

The backend ensures all relational connections between the new event and its layout are correctly established in PostgreSQL.

---

# Attendee Registration and Check-in Page: Functional Specification

The Attendee Registration and Check-in page is a streamlined portal that utilizes the modular, customized design system but limits its components to only those essential for a friction-less registration and immediate site entry.

- Registration and check-in link will be visible in the event card
- Once attendee registered a checkin link will be provided via email

---

# 1. Context and Setup (Reference to Existing Layouts)

This page is generated by the same **Event Creation Wizard** that created the full event page, but with a specific configuration:

- What is created in the event creation wizard will reflect the same in the registration page.
- The form is prominently featured

# 2. Dynamic Hero and Anticipation Zone

This top section is a streamlined version of the full event Hero section, designed to create focus.

## Visual Focus

The page uses:

- The same customized hero image
- The same event name

However, detailed descriptions are replaced with a singular call-to-action:

> **"Register Now & Enter the Raffle"**

# 3. The Registration Form (The Core Component)

This is the central interactive zone of the page.

The component is adapted directly from the reusable **Registration Form** module.

# 4. Immediate Check-in State (Post-Submission)

Once the **Smart Registration Form** is successfully submitted, the component dynamically changes state using React Hook Form state handling.

The registration form is replaced with a simplified check-in confirmation view.

## QR Code Generation

The page displays:

- A large unique QR code
- Generated from a backend UUID

This serves as the attendee ticket.

## Status Indicators

Below the QR code:

- A large green badge displays:

  > **Checked-in**

- Supporting text displays:

  > **Your Unique Check-in ID is [UUID]**

# 5. Persistent Live Monitor (Live Activity Zone)

This optional component mirrors the styling of the **Real-Time Activity Monitor** used across the Regevent dashboard ecosystem.

## Timeline Feed

A vertical activity feed displays anonymous registration updates such as:

> "J. Smith just registered"

---

# Regevent: Raffle Control Center Specification

This page is the operator console for triggering high-concurrency raffle draws.

It manages the full lifecycle of a drawing, from prize setup to randomized winner selection and automated email dispatch.

Page should include the event details (e.g. Image used, Date, Event title, and date)

---

# 1. Prize Management Zone

This panel handles the inventory of prizes assigned to a specific `Event` model.

## Create/Delete Prize

Standard forms with strict validation are used to manage the `Prize` table.

## Highlighted Titles

Fields include:

- Title

Examples:

- Grand Prize
- Consolation Prize

These titles are critical for visual formatting in the final winner announcements.

## Quantities

Tracks remaining prize stock to prevent the system from drawing more winners than available prizes.

---

# 2. Drawing Configuration & Controls

The central command module where operators configure draw rules and manage winner pre-selection.

---

## A. Draw Constraints (Zustand UI State)

Filters the available attendee list before the randomizer executes.

### Eligibility Multi-Select

Operators can toggle constraints to draw only from:

- Registered Attendees
- Checked-in Attendees
- Both

Checked-in validation is based on QR code attendance verification.

### Concurrency Note

Eligibility constraints must be validated within the backend transaction layer using:

```sql
SELECT ... FOR UPDATE
```

This prevents race conditions during high-concurrency check-in periods.

---

## B. Winner Logic & Pre-Selection

### Pre-Selection Toggle

When enabled:

- The system fetches a pre-configured list of winners
- The true random number generator is bypassed
- A backend audit log entry is created automatically

### Fake Randomizer Logic

If pre-selection mode is active:

- The backend uses a deterministic pseudo-random routine
- The result still appears non-predictable to observers
- The output adheres to the pre-selected winner sequence

---

# 3. Real-Time Drawing Canvas (Animation Zone)

A dedicated visual zone designed to create excitement during raffle execution.

---

## Text Roulette Animation

### Zustand State Sync

The animation component listens for the start of the FastAPI transaction lifecycle.

### Attendee Cycle

The animation dynamically pulls names from the filtered eligibility list.

Visual behavior includes:

- Rapid text cycling
- Blur/spin transition effects
- Hundreds of participant names rotating in sequence

Styling:

- Text Color: `#2D3748`
- Background Color: `#F8FAF9`

### The Reveal

The animation gradually slows down and stops at the exact moment the backend transaction commits.

The selected winner is revealed using a flash transition with the primary blue color:

- Primary Blue: `#81A6C6`

---

# 4. Draw Actions & Automation (FastAPI Interactions)

---

## A. The Atomic Draw (`SELECT FOR UPDATE`)

### Trigger

The organizer clicks:

> **Execute Atomic Draw**

The operation is intentionally non-asynchronous.

### The Lock

The backend executes an atomic transaction:

```sql
BEGIN;

SELECT *
FROM Attendee
WHERE event_id = X
AND is_eligible = TRUE
FOR UPDATE;

COMMIT;
```

This guarantees:

- One specific prize maps to one specific attendee
- No duplicate winners occur
- Database integrity remains consistent under concurrency

---

## B. Post-Draw Workflow (Asynchronous Email Hub)

Once the PostgreSQL transaction commits, an asynchronous task queue is populated with automated jobs.

### Winner Email (Proof)

The task parser:

- Merges winner data into a personalized template
- Sends a secure confirmation email
- Provides proof of winning

Example:

> Congratulations, Alice! You won the Grand Prize!

### Revoke Flow

Operators may revoke a winner through the admin interface.

Process:

- Select Winner
- Click **Revoke Prize**

This triggers an atomic update:

```sql
has_won = FALSE
```

After commit:

- The task queue generates a "Prize Revoked" email
- The attendee receives an automated notification

---

# 5. Winners List & Highlight Zone

A dedicated table/grid provides a real-time summary of draw results.

## Highlighted Titles

Prize titles are prominently displayed using the warmer accent color:

- Accent Highlight: `#F3E3D0`

This visually emphasizes high-value prizes.

## Audit Details

Each winner row displays:

- Winner Name
- Ticket Tier
  - General
  - VIP
- Prize Title
- Timestamp of atomic draw commit

This provides complete traceability for raffle operations.

---

# UI/UX Implementation Note

## Colors

The editor UI uses:

- `#F3E3D0` for sidebars
- `#D2C4B4` for borders

This visually differentiates the **management interface** from the **live preview** of the event.

## State Split

While the organizer is editing:

- State is kept local to Zustand
- Unnecessary API calls are prevented

Data is only persisted to the backend when the user clicks:

- **Save**
- **Publish**

## Technical Implementation Notes

### Colors

The UI implements the following palette:

- Primary Buttons: `#81A6C6`
- Background Accents: `#AACDDC`
- Card Highlighting: `#F3E3D0`

### Responsiveness

On mobile devices:

- The Activity Monitor should collapse into a floating action button, **or**
- Shift below the Events Grid to maintain the mobile-first hierarchy.