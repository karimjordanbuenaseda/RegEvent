const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function uploadEventCover(eventId: string, file: File): Promise<{ url: string }> {
  const token = localStorage.getItem('access_token')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/uploads/events/${eventId}/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Upload failed')
  }
  return res.json()
}

export async function uploadPrizeImage(eventId: string, prizeId: string, file: File): Promise<{ url: string }> {
  const token = localStorage.getItem('access_token')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/uploads/prizes/${eventId}/${prizeId}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Upload failed')
  }
  return res.json()
}
