import { apiFetch } from './client'

export interface ActivityItem {
  type: 'registration' | 'check_in' | 'revocation'
  attendee_name: string
  event_title: string
  timestamp: string
}

export interface ActivityPage {
  items: ActivityItem[]
  has_next: boolean
}

export function fetchRecentActivity(page: number, limit = 15): Promise<ActivityPage> {
  return apiFetch<ActivityPage>(`/activity/recent?page=${page}&limit=${limit}`)
}
