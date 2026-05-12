import { apiFetch } from './client'
import type { UserPublic } from './auth'

export function updateProfile(full_name: string): Promise<UserPublic> {
  return apiFetch<UserPublic>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ full_name }),
  })
}

export function changePassword(current_password: string, new_password: string): Promise<void> {
  return apiFetch<void>('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password, new_password }),
  })
}
