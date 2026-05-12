import { apiFetch } from './client'

export interface DashboardStats {
  total_live_events: number
  total_attendees: number
  total_prizes_awarded: number
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/stats/dashboard')
}
