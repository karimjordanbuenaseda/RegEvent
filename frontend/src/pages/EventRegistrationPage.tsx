import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { getEventBySlug } from '../api/events'
import type { EventBase } from '../api/events'
import { getLayoutsForEvent } from '../api/eventLayouts'
import type { EventLayout, ComponentType } from '../api/eventLayouts'
import { registerAttendee } from '../api/attendees'
import type { Attendee, TicketTier } from '../api/attendees'
import { listPrizesPublic } from '../api/raffle'
import type { Prize } from '../api/raffle'

const DEFAULT_PRIMARY = '#81A6C6'
const DEFAULT_ACCENT = '#AACDDC'

// ─── countdown helper ─────────────────────────────────────────────────────────

function getTimeLeft(dateStr: string) {
  const diff = Math.max(0, new Date(dateStr).getTime() - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1_000),
    started: diff === 0,
  }
}

// ─── hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ event, layout }: { event: EventBase; layout: EventLayout | null }) {
  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const accent = layout?.styles?.accent ?? DEFAULT_ACCENT

  return (
    <div className="relative h-52 w-full overflow-hidden">
      {layout?.cover_image_url ? (
        <>
          <img
            src={layout.cover_image_url}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-white/80 text-xs font-medium tracking-widest uppercase">RegEvent</p>
        <h1 className="text-white text-2xl font-bold leading-snug drop-shadow-md">{event.title}</h1>
        <p className="text-white/90 text-sm font-medium mt-1">Register Now &amp; Enter the Raffle</p>
      </div>
    </div>
  )
}

// ─── countdown ────────────────────────────────────────────────────────────────

function CountdownSection({ event, layout }: { event: EventBase; layout: EventLayout | null }) {
  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const [time, setTime] = useState(() => getTimeLeft(event.start_date))

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(event.start_date)), 1000)
    return () => clearInterval(id)
  }, [event.start_date])

  return (
    <div className="w-full px-6 py-5 flex flex-col items-center gap-3 bg-white border-b border-gray-100">
      <p className="text-xs uppercase tracking-wider text-gray-400">
        {time.started ? 'Event has started!' : 'Event starts in'}
      </p>
      {!time.started && (
        <div className="flex items-end gap-3">
          {(
            [
              ['Days', time.days],
              ['Hours', time.hours],
              ['Mins', time.mins],
              ['Secs', time.secs],
            ] as [string, number][]
          ).map(([label, val]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-base font-bold tabular-nums"
                style={{ backgroundColor: primary }}
              >
                {String(val).padStart(2, '0')}
              </div>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── map ──────────────────────────────────────────────────────────────────────

function MapSection({ event }: { event: EventBase }) {
  if (!event.latitude || !event.longitude) {
    return (
      <div className="w-full h-40 bg-gray-100 flex items-center justify-center border-b border-gray-100">
        <p className="text-xs text-gray-400">No location set for this event.</p>
      </div>
    )
  }

  return (
    <div className="w-full border-b border-gray-100">
      <iframe
        src={`https://maps.google.com/maps?q=${event.latitude},${event.longitude}&z=15&output=embed`}
        width="100%"
        height="240"
        style={{ border: 0, display: 'block' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Event Location"
      />
    </div>
  )
}

// ─── prize list ───────────────────────────────────────────────────────────────

function PrizeListSection({ event, layout }: { event: EventBase; layout: EventLayout | null }) {
  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const [prizes, setPrizes] = useState<Prize[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listPrizesPublic(event.id)
      .then((p) => { if (!cancelled) setPrizes(p) })
      .catch(() => { if (!cancelled) setPrizes([]) })
    return () => { cancelled = true }
  }, [event.id])

  if (prizes === null || prizes.length === 0) return null

  return (
    <div className="bg-white px-6 py-6 border-b border-gray-100">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Raffle Prizes</h2>
        <p className="text-sm text-gray-400 mt-0.5">Register to be eligible.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {prizes.map((prize) => (
          <div
            key={prize.id}
            className="flex flex-col rounded-xl border border-gray-100 overflow-hidden bg-white"
          >
            <div className="aspect-square w-full bg-gray-50 relative">
              {prize.image_url ? (
                <img src={prize.image_url} alt={prize.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
                  style={{ color: primary, background: `${primary}14` }}
                >
                  {prize.title.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="absolute top-2 left-2 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ background: primary }}
              >
                {prize.draw_order}
              </span>
            </div>
            <div className="p-3 flex flex-col gap-1">
              <p className="text-sm font-semibold text-gray-800 leading-tight truncate" title={prize.title}>
                {prize.title}
              </p>
              <p className="text-[11px] text-gray-400">{prize.quantity} winner{prize.quantity !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── registration form ────────────────────────────────────────────────────────

function RegistrationForm({
  event,
  layout,
  onSuccess,
}: {
  event: EventBase
  layout: EventLayout | null
  onSuccess: (attendee: Attendee) => void
}) {
  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [ticketTier, setTicketTier] = useState<TicketTier>('General')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const attendee = await registerAttendee({
        event_id: event.id,
        email,
        full_name: fullName || undefined,
        ticket_tier: ticketTier,
      })
      onSuccess(attendee)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white px-6 py-7">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Register</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date(event.start_date).toLocaleDateString('en-PH', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Full Name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan dela Cruz"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-30 transition"
            style={{ '--tw-ring-color': primary } as React.CSSProperties}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-30 transition"
            style={{ '--tw-ring-color': primary } as React.CSSProperties}
          />
          <p className="mt-1.5 text-xs text-gray-400">Your check-in link will be sent here.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Tier</label>
          <div className="flex gap-3">
            {(['General', 'VIP'] as TicketTier[]).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTicketTier(tier)}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all"
                style={
                  ticketTier === tier
                    ? { backgroundColor: primary, borderColor: primary, color: '#fff' }
                    : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#fff' }
                }
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {submitting ? 'Registering…' : 'Register Now'}
        </button>
      </form>
    </div>
  )
}

// ─── success state ────────────────────────────────────────────────────────────

function SuccessState({
  event,
  layout,
  attendee,
}: {
  event: EventBase
  layout: EventLayout | null
  attendee: Attendee
}) {
  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const checkinUrl = `${window.location.origin}/events/${event.slug}/checkin/${attendee.id}`

  return (
    <div className="bg-white px-6 py-7 flex flex-col items-center gap-6 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: primary }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">Registration Confirmed!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Welcome to <span className="font-medium text-gray-700">{event.title}</span>
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <QRCode value={checkinUrl} size={180} fgColor="#1f2937" bgColor="#ffffff" />
      </div>

      <div className="flex flex-col gap-1 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Your Check-in ID</p>
        <p className="font-mono text-xs text-gray-600 break-all">{attendee.id}</p>
      </div>

      <div className="w-full bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-green-700">
          A check-in link has been sent to <span className="font-medium">{attendee.email}</span>
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Save or screenshot this QR code — it's your event ticket.
      </p>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'form' | 'success' | 'inactive' | 'not_found'

export default function EventRegistrationPage() {
  const { slug } = useParams<{ slug: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [event, setEvent] = useState<EventBase | null>(null)
  const [layout, setLayout] = useState<EventLayout | null>(null)
  const [attendee, setAttendee] = useState<Attendee | null>(null)

  useEffect(() => {
    if (!slug) return
    async function load() {
      try {
        const ev = await getEventBySlug(slug!)
        if (!ev.is_active) {
          setEvent(ev)
          setPageState('inactive')
          return
        }
        setEvent(ev)
        const layouts = await getLayoutsForEvent(ev.id)
        setLayout(layouts[0] ?? null)
        setPageState('form')
      } catch {
        setPageState('not_found')
      }
    }
    load()
  }, [slug])

  // Ordered component list from layout; always ensure registration_form is present
  const structure = useMemo((): ComponentType[] => {
    const s = layout?.structure ?? []
    if (s.length === 0) return ['hero', 'registration_form']
    if (!s.includes('registration_form')) return [...s, 'registration_form']
    return s
  }, [layout])

  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const accent = layout?.styles?.accent ?? DEFAULT_ACCENT

  function renderComponent(type: ComponentType) {
    if (!event) return null
    switch (type) {
      case 'hero':
        return <HeroSection key="hero" event={event} layout={layout} />
      case 'registration_form':
        if (pageState === 'success' && attendee) {
          return <SuccessState key="form" event={event} layout={layout} attendee={attendee} />
        }
        return (
          <RegistrationForm
            key="form"
            event={event}
            layout={layout}
            onSuccess={(a) => {
              setAttendee(a)
              setPageState('success')
            }}
          />
        )
      case 'countdown':
        return <CountdownSection key="countdown" event={event} layout={layout} />
      case 'map':
        return <MapSection key="map" event={event} />
      case 'prize_list':
        return <PrizeListSection key="prize_list" event={event} layout={layout} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-16">
      <div className="w-full max-w-md shadow-lg overflow-hidden" style={{ marginTop: '5vh' }}>

        {pageState === 'loading' && (
          <>
            <div className="h-52 w-full bg-gray-200 animate-pulse" />
            <div className="bg-white px-6 py-7 flex flex-col gap-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-10 bg-gray-100 rounded-lg mt-2" />
            </div>
          </>
        )}

        {(pageState === 'form' || pageState === 'success') && event && (
          structure.map((type) => renderComponent(type))
        )}

        {pageState === 'inactive' && event && (
          <>
            <HeroSection event={event} layout={layout} />
            <div className="bg-white px-6 py-7 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Registrations Closed</h2>
                <p className="text-sm text-gray-400 mt-1">
                  <span className="font-medium text-gray-600">{event.title}</span> is no longer accepting registrations.
                </p>
              </div>
            </div>
          </>
        )}

        {pageState === 'not_found' && (
          <div className="bg-white px-6 py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-gray-500 text-sm">This event could not be found.</p>
          </div>
        )}

        {/* Footer brand strip */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
        />
      </div>
    </div>
  )
}
