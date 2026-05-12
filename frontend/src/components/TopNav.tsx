import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-accent/25 text-brand-primary'
      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
  }`

export default function TopNav() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0 mr-4">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
          <span className="text-lg font-bold tracking-tight text-gray-900">RegEvent</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User section */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{user.full_name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-brand-accent/30 text-brand-primary'
                }`}
              >
                {user.role}
              </span>
            </div>
            <UserAvatar name={user.full_name} />
          </div>
        )}

        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
        >
          Sign out
        </button>

      </div>
    </nav>
  )
}
