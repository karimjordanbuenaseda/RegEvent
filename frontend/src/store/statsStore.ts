import { create } from 'zustand'
import { fetchDashboardStats } from '../api/stats'
import type { DashboardStats } from '../api/stats'

interface StatsState {
  stats: DashboardStats | null
  isLoading: boolean
  error: string | null
  fetch: () => Promise<void>
  clear: () => void
}

export const useStatsStore = create<StatsState>()((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null })
    try {
      const stats = await fetchDashboardStats()
      set({ stats, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clear: () => set({ stats: null, isLoading: false, error: null }),
}))
