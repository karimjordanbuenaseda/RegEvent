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
}

export function fetchMyEvents(): Promise<EventWithStats[]> {
  return apiFetch<EventWithStats[]>('/events/me')
}
