import { create } from 'zustand'
import { listPrizes, createPrize, updatePrize, deletePrize, drawWinner } from '../api/raffle'
import type { Prize, PrizeCreate, PrizeUpdate, RaffleWinner } from '../api/raffle'

type Eligibility = 'checked_in' | 'registered' | 'both'

interface RaffleState {
  prizes: Prize[]
  isLoading: boolean
  error: string | null

  eligibility: Eligibility
  setEligibility: (e: Eligibility) => void

  isDrawing: boolean
  drawError: string | null
  lastWinner: RaffleWinner | null
  clearWinner: () => void

  fetchPrizes: (eventId: string) => Promise<void>
  addPrize: (eventId: string, data: PrizeCreate) => Promise<void>
  editPrize: (eventId: string, prizeId: string, data: PrizeUpdate) => Promise<void>
  removePrize: (eventId: string, prizeId: string) => Promise<void>
  executeDraw: (eventId: string, prizeId?: string) => Promise<void>
  clear: () => void
}

export const useRaffleStore = create<RaffleState>()((set, get) => ({
  prizes: [],
  isLoading: false,
  error: null,

  eligibility: 'checked_in',
  setEligibility: (e) => set({ eligibility: e }),

  isDrawing: false,
  drawError: null,
  lastWinner: null,
  clearWinner: () => set({ lastWinner: null, drawError: null }),

  fetchPrizes: async (eventId: string) => {
    set({ isLoading: true, error: null })
    try {
      const prizes = await listPrizes(eventId)
      set({ prizes, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  addPrize: async (eventId: string, data: PrizeCreate) => {
    const prize = await createPrize(eventId, data)
    set({ prizes: [...get().prizes, prize].sort((a, b) => a.draw_order - b.draw_order) })
  },

  editPrize: async (eventId: string, prizeId: string, data: PrizeUpdate) => {
    const updated = await updatePrize(eventId, prizeId, data)
    set({
      prizes: get().prizes
        .map((p) => (p.id === prizeId ? updated : p))
        .sort((a, b) => a.draw_order - b.draw_order),
    })
  },

  removePrize: async (eventId: string, prizeId: string) => {
    await deletePrize(eventId, prizeId)
    set({ prizes: get().prizes.filter((p) => p.id !== prizeId) })
  },

  executeDraw: async (eventId: string, prizeId?: string) => {
    set({ isDrawing: true, drawError: null, lastWinner: null })
    try {
      const winner = await drawWinner(eventId, {
        eligibility: get().eligibility,
        prize_id: prizeId,
      })
      set({ lastWinner: winner, isDrawing: false })
    } catch (err) {
      set({ drawError: (err as Error).message, isDrawing: false })
    }
  },

  clear: () => set({
    prizes: [],
    isLoading: false,
    error: null,
    eligibility: 'checked_in',
    isDrawing: false,
    drawError: null,
    lastWinner: null,
  }),
}))
