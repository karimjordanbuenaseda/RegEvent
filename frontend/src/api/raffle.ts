import { apiFetch } from './client'

export interface Prize {
  id: string
  event_id: string
  title: string
  quantity: number
  draw_order: number
}

export interface PrizeCreate {
  title: string
  quantity: number
  draw_order?: number
}

export interface PrizeUpdate {
  title?: string
  quantity?: number
  draw_order?: number
}

export interface RaffleWinner {
  id: string
  event_id: string
  email: string
  full_name: string | null
  ticket_tier: 'General' | 'VIP'
  check_in_status: boolean
  has_won: boolean
  won_at: string | null
  prize_title: string | null
}

export function listPrizes(eventId: string): Promise<Prize[]> {
  return apiFetch<Prize[]>(`/raffle/${eventId}/prizes`)
}

export function createPrize(eventId: string, data: PrizeCreate): Promise<Prize> {
  return apiFetch<Prize>(`/raffle/${eventId}/prizes`, { method: 'POST', body: JSON.stringify(data) })
}

export function updatePrize(eventId: string, prizeId: string, data: PrizeUpdate): Promise<Prize> {
  return apiFetch<Prize>(`/raffle/${eventId}/prizes/${prizeId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deletePrize(eventId: string, prizeId: string): Promise<void> {
  return apiFetch<void>(`/raffle/${eventId}/prizes/${prizeId}`, { method: 'DELETE' })
}

export interface DrawRequest {
  eligibility: 'checked_in' | 'registered' | 'both'
  prize_id?: string
  include_winners?: boolean
}

export function drawWinner(eventId: string, req: DrawRequest): Promise<RaffleWinner> {
  return apiFetch<RaffleWinner>(`/raffle/${eventId}/draw`, { method: 'POST', body: JSON.stringify(req) })
}

export function listWinners(eventId: string): Promise<RaffleWinner[]> {
  return apiFetch<RaffleWinner[]>(`/raffle/${eventId}/winners`)
}

export function revokeWinner(eventId: string, attendeeId: string): Promise<RaffleWinner> {
  return apiFetch<RaffleWinner>(`/raffle/${eventId}/winners/${attendeeId}/revoke`, { method: 'POST' })
}
