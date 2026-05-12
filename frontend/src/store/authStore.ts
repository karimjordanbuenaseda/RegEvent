import { create } from 'zustand'
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth'
import type { UserPublic } from '../api/auth'

const TOKEN_KEY = 'access_token'

interface AuthState {
  token: string | null
  user: UserPublic | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; full_name: string; password: string; role: 'admin' | 'creator' }) => Promise<void>
  logout: () => void
  hydrate: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
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
  },

  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    set({ token })
    try {
      const user = await getMe()
      set({ user })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null })
    }
  },

  clearError: () => set({ error: null }),
}))
