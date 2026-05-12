import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { getEventBySlug } from '../api/events'
import type { EventBase } from '../api/events'
import { getLayoutsForEvent } from '../api/eventLayouts'
import type { EventLayout } from '../api/eventLayouts'
import { registerAttendee } from '../api/attendees'
import type { Attendee, TicketTier } from '../api/attendees'

const DEFAULT_PRIMARY = '#81A6C6'
const DEFAULT_ACCENT = '#AACDDC'

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'inactive' | 'not_found' | 'error'

function HeroSection({
  event,
  layout,
}: {
  event: EventBase
  layout: EventLayout | null
}) {
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
  )
}

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
    <div className="flex flex-col items-center gap-6 text-center">
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
        <QRCode
          value={checkinUrl}
          size={180}
          fgColor="#1f2937"
          bgColor="#ffffff"
        />
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

  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-16">
      <div className="w-full max-w-md shadow-lg overflow-hidden" style={{ marginTop: '5vh' }}>
        {/* Hero */}
        {(pageState === 'loading' || event) && (
          <>
            {event ? (
              <HeroSection event={event} layout={layout} />
            ) : (
              <div className="h-52 w-full bg-gray-200 animate-pulse" />
            )}
          </>
        )}

        {/* Card body */}
        <div className="bg-white px-6 py-7">
          {pageState === 'loading' && (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-10 bg-gray-100 rounded-lg mt-2" />
            </div>
          )}

          {pageState === 'form' && event && (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">Register</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {new Date(event.start_date).toLocaleDateString('en-PH', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <RegistrationForm
                event={event}
                layout={layout}
                onSuccess={(a) => {
                  setAttendee(a)
                  setPageState('success')
                }}
              />
            </>
          )}

          {pageState === 'success' && event && attendee && (
            <SuccessState event={event} layout={layout} attendee={attendee} />
          )}

          {pageState === 'inactive' && event && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
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
          )}

          {pageState === 'not_found' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-gray-500 text-sm">This event could not be found.</p>
            </div>
          )}
        </div>

        {/* Footer brand strip */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(to right, ${primary}, ${layout?.styles?.accent ?? DEFAULT_ACCENT})` }}
        />
      </div>
    </div>
  )
}
