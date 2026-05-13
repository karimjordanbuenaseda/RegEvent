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
  ticket_tier: 'general' | 'vip'
  check_in_status: boolean
  has_won: boolean
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

export function drawWinner(eventId: string): Promise<RaffleWinner> {
  return apiFetch<RaffleWinner>(`/raffle/${eventId}/draw`, { method: 'POST' })
}
