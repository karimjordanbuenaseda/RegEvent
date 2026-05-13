import { create } from 'zustand'
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth'
import type { UserPublic } from '../api/auth'
import { ApiError } from '../api/client'
import { useEventsStore } from './eventsStore'
import { useStatsStore } from './statsStore'
import { useActivityStore } from './activityStore'

const TOKEN_KEY = 'access_token'

interface AuthState {
  token: string | null
  user: UserPublic | null
  hydrated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; full_name: string; password: string; role: 'admin' | 'creator' }) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
  setUser: (user: UserPublic) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  hydrated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null, user: null })
    try {
      const { access_token } = await apiLogin(email, password)
      localStorage.setItem(TOKEN_KEY, access_token)
      // Token acquired — login is successful. Fetch profile in background.
      set({ token: access_token, isLoading: false })
      getMe().then((user) => set({ user })).catch(() => {
        // profile fetch failed; token is still valid, hydrate() will retry on next mount
      })
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await apiRegister(data)
      set({ isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null, error: null })
    useEventsStore.getState().clear()
    useStatsStore.getState().clear()
    useActivityStore.getState().clear()
  },

  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({ hydrated: true })
      return
    }
    set({ token })
    try {
      const user = await getMe()
      set({ user, hydrated: true })
    } catch (err) {
      // Only invalidate the session on explicit auth rejection (401/403).
      // Network errors or backend cold-starts should not log the user out.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(TOKEN_KEY)
        set({ token: null, user: null, hydrated: true })
      } else {
        set({ hydrated: true })
      }
    }
  },

  setUser: (user: UserPublic) => set({ user }),

  clearError: () => set({ error: null }),
}))
