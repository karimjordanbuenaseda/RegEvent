import { useState } from 'react'
import TopNav from '../components/TopNav'
import { useAuthStore } from '../store/authStore'
import { updateProfile, changePassword } from '../api/users'

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-brand-accent/30 text-brand-primary'
    }`}>
      {isAdmin ? 'Admin' : 'Creator'}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="w-20 h-20 rounded-full bg-brand-primary flex items-center justify-center text-white text-2xl font-semibold shrink-0">
      {initials}
    </div>
  )
}

function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <p className={`text-sm ${type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
      {text}
    </p>
  )
}

function IdentityCard() {
  const { user, setUser } = useAuthStore()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (!fullName.trim()) return
    setSaving(true)
    setStatus(null)
    try {
      const updated = await updateProfile(fullName.trim())
      setUser(updated)
      setFullName(updated.full_name)
      setStatus({ type: 'success', text: 'Profile updated.' })
    } catch (err) {
      setStatus({ type: 'error', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <h2 className="text-base font-semibold text-gray-800">Account Identity</h2>

      <div className="flex items-center gap-4">
        <Avatar name={user?.full_name ?? '?'} />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <RoleBadge role={user?.role ?? 'creator'} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            value={user?.email ?? ''}
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Role</label>
          <input
            value={user?.role === 'admin' ? 'Admin' : 'Creator'}
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim() || fullName.trim() === user?.full_name}
          className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {status && <StatusMessage type={status.type} text={status.text} />}
      </div>
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  const handleSubmit = async () => {
    if (!canSubmit) return
    setCurrent('')
    setNext('')
    setConfirm('')
    setSaving(true)
    setStatus(null)
    try {
      await changePassword(current, next)
      setStatus({ type: 'success', text: 'Password updated.' })
    } catch (err) {
      setStatus({ type: 'error', text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <h2 className="text-base font-semibold text-gray-800">Change Password</h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
          />
          {next.length > 0 && next.length < 8 && (
            <p className="text-xs text-amber-500">Minimum 8 characters</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-colors ${
              mismatch ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-brand-primary'
            }`}
          />
          {mismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </button>
        {status && <StatusMessage type={status.type} text={status.text} />}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <IdentityCard />
        <PasswordCard />
      </main>
    </div>
  )
}
