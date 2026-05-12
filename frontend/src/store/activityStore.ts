import { create } from 'zustand'
import { fetchRecentActivity } from '../api/activity'
import type { ActivityItem } from '../api/activity'

interface ActivityState {
  items: ActivityItem[]
  page: number
  hasNext: boolean
  isLoading: boolean
  error: string | null
  fetchPage: (page: number) => Promise<void>
  nextPage: () => void
  prevPage: () => void
  clear: () => void
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
  items: [],
  page: 1,
  hasNext: false,
  isLoading: false,
  error: null,

  fetchPage: async (page: number) => {
    set({ isLoading: true, error: null })
    try {
      const { items, has_next } = await fetchRecentActivity(page)
      set({ items, hasNext: has_next, page, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  nextPage: () => {
    const { page, hasNext, fetchPage } = get()
    if (hasNext) fetchPage(page + 1)
  },

  prevPage: () => {
    const { page, fetchPage } = get()
    if (page > 1) fetchPage(page - 1)
  },

  clear: () => set({ items: [], page: 1, hasNext: false, isLoading: false, error: null }),
}))
