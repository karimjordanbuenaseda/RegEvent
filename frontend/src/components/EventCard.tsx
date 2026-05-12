import { useNavigate } from 'react-router-dom'
import type { EventWithStats } from '../api/events'

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 shrink-0">
      Completed
    </span>
  )
}

function CheckInBar({ checked, total }: { checked: number; total: number }) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Check-in progress</span>
        <span className="font-medium text-gray-700">{checked} / {total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 text-right">{pct}% checked in</span>
    </div>
  )
}

export default function EventCard({ event }: { event: EventWithStats }) {
  const navigate = useNavigate()
  const formattedDate = new Date(event.start_date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{event.title}</h3>
        <StatusBadge isActive={event.is_active} />
      </div>

      <p className="text-xs text-gray-400 -mt-2">{formattedDate}</p>

      <CheckInBar checked={event.checked_in_count} total={event.total_attendees} />

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => navigate(`/events/${event.slug}/edit`)}
          className="flex-1 text-sm font-medium py-2 rounded-lg border border-brand-primary text-brand-primary hover:bg-brand-accent/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => navigate(`/events/${event.slug}/raffle`)}
          className="flex-1 text-sm font-medium py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity"
        >
          Raffle Control
        </button>
      </div>

    </div>
  )
}
