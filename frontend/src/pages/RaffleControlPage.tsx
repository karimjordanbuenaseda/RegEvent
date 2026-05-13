import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMyEvents } from '../api/events'
import type { EventWithStats } from '../api/events'
import { useRaffleStore } from '../store/raffleStore'
import type { Prize } from '../api/raffle'

// ─── Prize Form ───────────────────────────────────────────────────────────────

interface PrizeFormValues {
  title: string
  quantity: string
  draw_order: string
}

const emptyForm = (): PrizeFormValues => ({ title: '', quantity: '1', draw_order: '' })

function PrizeForm({
  initial,
  nextOrder,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: PrizeFormValues
  nextOrder: number
  onSave: (values: PrizeFormValues) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [values, setValues] = useState<PrizeFormValues>(initial ?? { ...emptyForm(), draw_order: String(nextOrder) })

  function set(key: keyof PrizeFormValues, val: string) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  const isValid = values.title.trim().length > 0 && Number(values.quantity) >= 1

  return (
    <div className="flex flex-col gap-3 bg-brand-surface rounded-xl border border-[#D2C4B4] p-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Prize Name</label>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Grand Prize"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full text-sm border border-[#D2C4B4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            value={values.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            className="w-full text-sm border border-[#D2C4B4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-500 mb-1">Draw Order</label>
          <input
            type="number"
            min={1}
            value={values.draw_order}
            onChange={(e) => set('draw_order', e.target.value)}
            className="w-full text-sm border border-[#D2C4B4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-white"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="text-xs font-medium px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(values)}
          disabled={!isValid || isSaving}
          className="text-xs font-medium px-4 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-40 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Prize'}
        </button>
      </div>
    </div>
  )
}

// ─── Prize Row ────────────────────────────────────────────────────────────────

function PrizeRow({
  prize,
  eventId,
  nextOrder,
}: {
  prize: Prize
  eventId: string
  nextOrder: number
}) {
  const { editPrize, removePrize } = useRaffleStore()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave(values: PrizeFormValues) {
    setIsSaving(true)
    try {
      await editPrize(eventId, prize.id, {
        title: values.title.trim(),
        quantity: Number(values.quantity),
        draw_order: Number(values.draw_order),
      })
      setMode('view')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsSaving(true)
    try {
      await removePrize(eventId, prize.id)
    } finally {
      setIsSaving(false)
    }
  }

  if (mode === 'edit') {
    return (
      <PrizeForm
        initial={{ title: prize.title, quantity: String(prize.quantity), draw_order: String(prize.draw_order) }}
        nextOrder={nextOrder}
        onSave={handleSave}
        onCancel={() => setMode('view')}
        isSaving={isSaving}
      />
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div className="flex items-center gap-3 bg-red-50 rounded-xl border border-red-200 px-4 py-3">
        <p className="flex-1 text-sm text-red-600">
          Delete <strong>{prize.title}</strong>?
        </p>
        <button
          onClick={() => setMode('view')}
          disabled={isSaving}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isSaving}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          {isSaving ? '…' : 'Delete'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#D2C4B4] px-4 py-3 group">
      <span className="w-7 h-7 rounded-full bg-brand-accent/30 text-brand-primary text-xs font-bold flex items-center justify-center shrink-0">
        {prize.draw_order}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{prize.title}</p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">×{prize.quantity}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setMode('edit')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-primary hover:bg-brand-accent/20 transition-colors"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
          </svg>
        </button>
        <button
          onClick={() => setMode('confirm-delete')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Prize Setup Panel ────────────────────────────────────────────────────────

function PrizeSetupPanel({ eventId }: { eventId: string }) {
  const { prizes, isLoading, error, fetchPrizes, addPrize } = useRaffleStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPrizes(eventId)
  }, [fetchPrizes, eventId])

  const nextOrder = prizes.length > 0 ? Math.max(...prizes.map((p) => p.draw_order)) + 1 : 1

  async function handleAdd(values: PrizeFormValues) {
    setIsSaving(true)
    try {
      await addPrize(eventId, {
        title: values.title.trim(),
        quantity: Number(values.quantity),
        draw_order: values.draw_order ? Number(values.draw_order) : undefined,
      })
      setShowAddForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Prize Setup</h2>
          <p className="text-xs text-gray-400 mt-0.5">Prizes are drawn in draw order, lowest first.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Prize
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">Could not load prizes.</p>}

      {isLoading && prizes.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : prizes.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No prizes yet</p>
          <p className="text-xs text-gray-400">Add prizes to set up the raffle draw order.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {prizes.map((prize) => (
            <PrizeRow key={prize.id} prize={prize} eventId={eventId} nextOrder={nextOrder} />
          ))}
        </div>
      )}

      {showAddForm && (
        <PrizeForm
          nextOrder={nextOrder}
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isSaving={isSaving}
        />
      )}

      {prizes.length > 0 && (
        <p className="text-xs text-gray-400 text-right pt-1">
          {prizes.length} prize{prizes.length !== 1 ? 's' : ''} · {prizes.reduce((s, p) => s + p.quantity, 0)} total awards
        </p>
      )}
    </div>
  )
}

// ─── Draw Control Placeholder ──────────────────────────────────────────────────

function DrawControlPlaceholder() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Draw Control</h2>
        <p className="text-xs text-gray-400 mt-0.5">Live draw controls will appear here.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">Coming soon</p>
        <p className="text-xs text-gray-400">Set up your prizes first, then run the live draw.</p>
      </div>
    </div>
  )
}

// ─── Event Detail Card ────────────────────────────────────────────────────────

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function EventDetailCard({ event, prizeCount }: { event: EventWithStats; prizeCount: number }) {
  const date = new Date(event.start_date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const checkInPct = event.total_attendees > 0
    ? Math.round((event.checked_in_count / event.total_attendees) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Cover strip */}
      {event.cover_image_url ? (
        <div className="h-28 w-full overflow-hidden">
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="h-28 w-full"
          style={{
            background: event.primary_color && event.accent_color
              ? `linear-gradient(to right, ${event.primary_color}, ${event.accent_color})`
              : 'linear-gradient(to right, #81A6C6, #AACDDC)',
          }}
        />
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">{event.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{formattedDate} · {formattedTime}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
            event.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {event.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Location */}
        {event.latitude != null && event.longitude != null && (
          <a
            href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline w-fit"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)} — View on map
          </a>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-50">
          <StatTile label="Total Attendees" value={event.total_attendees} />
          <StatTile
            label="Checked In"
            value={event.checked_in_count}
            sub={event.total_attendees > 0 ? `${checkInPct}% of attendees` : undefined}
          />
          <StatTile label="Prizes" value={prizeCount} sub={prizeCount > 0 ? 'configured' : 'none yet'} />
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaffleControlPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { clear, prizes } = useRaffleStore()

  const [event, setEvent] = useState<EventWithStats | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetchMyEvents()
      .then((events) => {
        const match = events.find((e) => e.slug === slug)
        if (match) setEvent(match)
        else setLoadError(true)
      })
      .catch(() => setLoadError(true))
    return () => clear()
  }, [slug, clear])

  if (loadError) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Event not found.</p>
          <button onClick={() => navigate('/')} className="text-sm text-brand-primary underline">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-surface">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Back to dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Raffle Control</p>
            {event ? (
              <h1 className="text-lg font-semibold text-gray-800 truncate">{event.title}</h1>
            ) : (
              <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mt-0.5" />
            )}
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-accent/30 text-brand-primary">
            Raffle
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6">
        {event ? (
          <>
            <EventDetailCard event={event} prizeCount={prizes.length} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PrizeSetupPanel eventId={event.id} />
              <DrawControlPlaceholder />
            </div>
          </>
        ) : !loadError ? (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-56 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse" />
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-64 animate-pulse" />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
