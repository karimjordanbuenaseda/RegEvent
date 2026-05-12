import { create } from 'zustand'
import { fetchRecentActivity } from '../api/activity'
import type { ActivityItem } from '../api/activity'

interface ActivityState {
  items: ActivityItem[]
  isLoading: boolean
  error: string | null
  fetch: () => Promise<void>
  clear: () => void
}

export const useActivityStore = create<ActivityState>()((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null })
    try {
      const items = await fetchRecentActivity()
      set({ items, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clear: () => set({ items: [], isLoading: false, error: null }),
}))
