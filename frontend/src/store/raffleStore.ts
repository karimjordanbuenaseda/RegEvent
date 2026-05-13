import { create } from 'zustand'
import { listPrizes, createPrize, updatePrize, deletePrize } from '../api/raffle'
import type { Prize, PrizeCreate, PrizeUpdate } from '../api/raffle'

interface RaffleState {
  prizes: Prize[]
  isLoading: boolean
  error: string | null
  fetchPrizes: (eventId: string) => Promise<void>
  addPrize: (eventId: string, data: PrizeCreate) => Promise<void>
  editPrize: (eventId: string, prizeId: string, data: PrizeUpdate) => Promise<void>
  removePrize: (eventId: string, prizeId: string) => Promise<void>
  clear: () => void
}

export const useRaffleStore = create<RaffleState>()((set, get) => ({
  prizes: [],
  isLoading: false,
  error: null,

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

  clear: () => set({ prizes: [], isLoading: false, error: null }),
}))
