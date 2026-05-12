import { apiFetch } from './client'

export type ComponentType = 'hero' | 'registration_form' | 'map' | 'countdown'

export interface EventLayout {
  id: string
  event_id: string
  layout_name: string
  structure: ComponentType[] | null
  styles: Record<string, string> | null
  cover_image_url: string | null
}

export interface LayoutCreatePayload {
  event_id: string
  layout_name: string
  structure?: ComponentType[] | null
  styles?: Record<string, string> | null
  cover_image_url?: string | null
}

export interface LayoutUpdatePayload {
  layout_name?: string
  structure?: ComponentType[] | null
  styles?: Record<string, string> | null
  cover_image_url?: string | null
}

export function getLayoutsForEvent(eventId: string): Promise<EventLayout[]> {
  return apiFetch<EventLayout[]>(`/event-layouts/?event_id=${eventId}`)
}

export function createLayout(payload: LayoutCreatePayload): Promise<EventLayout> {
  return apiFetch<EventLayout>('/event-layouts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateLayout(layoutId: string, payload: LayoutUpdatePayload): Promise<EventLayout> {
  return apiFetch<EventLayout>(`/event-layouts/${layoutId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
