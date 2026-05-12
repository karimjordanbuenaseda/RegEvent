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