import { apiFetch } from './client'

export interface ActivityItem {
  type: 'registration' | 'check_in'
  attendee_name: string
  event_title: string
  timestamp: string
}

export function fetchRecentActivity(): Promise<ActivityItem[]> {
  return apiFetch<ActivityItem[]>('/activity/recent')
}
