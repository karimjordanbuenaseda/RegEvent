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

- Only the **Registration Form** component is active
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

This optional component mirrors the styling of the **Real-Time Activity Monitor** used across the Evently dashboard ecosystem.

## Timeline Feed

A vertical activity feed displays anonymous registration updates such as:

> "J. Smith just registered"

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