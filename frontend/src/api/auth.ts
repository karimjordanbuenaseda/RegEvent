import { apiFetch } from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserPublic {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'creator'
  is_active: boolean
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // OAuth2PasswordRequestForm expects the field named "username"
    body: new URLSearchParams({ username: email, password }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(error.detail ?? 'Login failed')
  }
  return res.json()
}

export async function register(data: {
  email: string
  full_name: string
  password: string
  role: 'admin' | 'creator'
}): Promise<UserPublic> {
  return apiFetch<UserPublic>('/users/', { method: 'POST', body: JSON.stringify(data) })
}

export async function getMe(): Promise<UserPublic> {
  return apiFetch<UserPublic>('/auth/me')
}
