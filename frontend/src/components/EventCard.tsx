import { useNavigate } from 'react-router-dom'
import type { EventWithStats } from '../api/events'

const DEFAULT_PRIMARY = '#81A6C6'
const DEFAULT_ACCENT = '#AACDDC'

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

function CheckInBar({ checked, total }: { checked: number; total: number; }) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Check-in progress</span>
        <span className="font-medium text-gray-700">{checked} / {total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: DEFAULT_PRIMARY }}
        />
      </div>
      <span className="text-xs text-gray-400 text-right">{pct}% checked in</span>
    </div>
  )
}

export default function EventCard({ event }: { event: EventWithStats }) {
  const navigate = useNavigate()
  const primary = event.primary_color ?? DEFAULT_PRIMARY
  const accent = event.accent_color ?? DEFAULT_ACCENT

  const formattedDate = new Date(event.start_date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

      {event.cover_image_url ? (
        <div className="h-28 w-full shrink-0 overflow-hidden">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-28 w-full shrink-0 overflow-hidden"
          style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
        />
      )}

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{event.title}</h3>
          <StatusBadge isActive={event.is_active} />
        </div>

        <p className="text-xs text-gray-400 -mt-2">{formattedDate}</p>

        <CheckInBar checked={event.checked_in_count} total={event.total_attendees} />

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => navigate(`/events/${event.slug}/edit`)}
            className="flex-1 text-sm font-medium py-2 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: DEFAULT_PRIMARY, color: DEFAULT_PRIMARY }}
          >
            Edit
          </button>
          <button
            onClick={() => navigate(`/events/${event.slug}/raffle`)}
            className="flex-1 text-sm font-medium py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: DEFAULT_PRIMARY }}
          >
            Raffle Control
          </button>
        </div>
      </div>

    </div>
  )
}
