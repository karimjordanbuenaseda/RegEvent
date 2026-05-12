import { apiFetch } from './client'

export interface EventWithStats {
  id: string
  owner_id: string
  title: string
  slug: string
  latitude: number | null
  longitude: number | null
  is_active: boolean
  start_date: string
  total_attendees: number
  checked_in_count: number
  cover_image_url: string | null
  primary_color: string | null
  accent_color: string | null
}

export interface EventBase {
  id: string
  owner_id: string
  title: string
  slug: string
  latitude: number | null
  longitude: number | null
  is_active: boolean
  start_date: string
}

export interface EventCreatePayload {
  title: string
  slug: string
  start_date: string
  is_active: boolean
  latitude: number | null
  longitude: number | null
}

export function fetchMyEvents(): Promise<EventWithStats[]> {
  return apiFetch<EventWithStats[]>('/events/me')
}

export function getEventBySlug(slug: string): Promise<EventBase> {
  return apiFetch<EventBase>(`/events/${slug}`)
}

export function createEvent(payload: EventCreatePayload): Promise<EventBase> {
  return apiFetch<EventBase>('/events/', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateEvent(eventId: string, payload: Partial<EventCreatePayload>): Promise<EventBase> {
  return apiFetch<EventBase>(`/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}
