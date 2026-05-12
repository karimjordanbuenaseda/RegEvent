import { apiFetch } from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type TicketTier = 'General' | 'VIP'

export interface AttendeeCreate {
  event_id: string
  email: string
  full_name?: string
  ticket_tier?: TicketTier
}

export interface Attendee {
  id: string
  event_id: string
  email: string
  full_name: string | null
  ticket_tier: TicketTier
  check_in_status: boolean
  has_won: boolean
  created_at: string
  checked_in_at: string | null
}

export async function registerAttendee(payload: AttendeeCreate): Promise<Attendee> {
  const res = await fetch(`${BASE_URL}/attendees/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Registration failed')
  }
  return res.json()
}

export function getAttendee(attendeeId: string): Promise<Attendee> {
  return apiFetch<Attendee>(`/attendees/${attendeeId}`)
}

export function checkInAttendee(attendeeId: string): Promise<Attendee> {
  return apiFetch<Attendee>(`/attendees/${attendeeId}/check-in`, { method: 'PATCH' })
}

export function listAttendees(eventId: string): Promise<Attendee[]> {
  return apiFetch<Attendee[]>(`/attendees/?event_id=${eventId}`)
}

export function inviteAttendee(payload: AttendeeCreate): Promise<Attendee> {
  return apiFetch<Attendee>('/attendees/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
