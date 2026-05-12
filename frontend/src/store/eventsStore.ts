import { create } from 'zustand'
import { fetchMyEvents } from '../api/events'
import type { EventWithStats } from '../api/events'

interface EventsState {
  events: EventWithStats[]
  isLoading: boolean
  error: string | null
  fetch: () => Promise<void>
  clear: () => void
}

export const useEventsStore = create<EventsState>()((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null })
    try {
      const events = await fetchMyEvents()
      set({ events, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clear: () => set({ events: [], isLoading: false, error: null }),
}))
