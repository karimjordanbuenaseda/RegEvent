import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEventBySlug } from '../api/events'
import type { EventBase } from '../api/events'
import { getLayoutsForEvent } from '../api/eventLayouts'
import type { EventLayout } from '../api/eventLayouts'
import { getAttendee, checkInAttendee } from '../api/attendees'
import type { Attendee } from '../api/attendees'

const DEFAULT_PRIMARY = '#81A6C6'
const DEFAULT_ACCENT = '#AACDDC'

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  VIP: { bg: '#fef9c3', text: '#854d0e' },
  General: { bg: '#f1f5f9', text: '#475569' },
}

type PageState = 'loading' | 'ready' | 'checking_in' | 'done' | 'not_found' | 'error'

export default function CheckInPage() {
  const { slug, attendeeId } = useParams<{ slug: string; attendeeId: string }>()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [event, setEvent] = useState<EventBase | null>(null)
  const [layout, setLayout] = useState<EventLayout | null>(null)
  const [attendee, setAttendee] = useState<Attendee | null>(null)

  useEffect(() => {
    if (!slug || !attendeeId) return
    async function load() {
      try {
        const [ev, att] = await Promise.all([
          getEventBySlug(slug!),
          getAttendee(attendeeId!),
        ])
        const layouts = await getLayoutsForEvent(ev.id)
        setEvent(ev)
        setLayout(layouts[0] ?? null)
        setAttendee(att)
        setPageState(att.check_in_status ? 'done' : 'ready')
      } catch {
        setPageState('not_found')
      }
    }
    load()
  }, [slug, attendeeId])

  async function handleCheckIn() {
    if (!attendeeId) return
    setPageState('checking_in')
    try {
      const updated = await checkInAttendee(attendeeId)
      setAttendee(updated)
      setPageState('done')
    } catch {
      setPageState('error')
    }
  }

  const primary = layout?.styles?.primary ?? DEFAULT_PRIMARY
  const accent = layout?.styles?.accent ?? DEFAULT_ACCENT
  const tierColors = attendee ? (TIER_COLORS[attendee.ticket_tier] ?? TIER_COLORS.General) : TIER_COLORS.General

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-16">
      <div className="w-full max-w-md shadow-lg overflow-hidden" style={{ marginTop: '5vh' }}>

        {/* Hero */}
        <div className="relative h-44 w-full overflow-hidden">
          {layout?.cover_image_url ? (
            <>
              <img
                src={layout.cover_image_url}
                alt={event?.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
            <p className="text-white/70 text-xs font-medium tracking-widest uppercase">RegEvent</p>
            {event ? (
              <h1 className="text-white text-xl font-bold leading-snug drop-shadow-md">{event.title}</h1>
            ) : (
              <div className="h-6 w-40 bg-white/20 rounded animate-pulse" />
            )}
            <p className="text-white/80 text-xs mt-0.5">Check-In</p>
          </div>
        </div>

        {/* Card body */}
        <div className="bg-white px-6 py-7">

          {pageState === 'loading' && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-100 rounded-xl mt-2" />
            </div>
          )}

          {(pageState === 'ready' || pageState === 'checking_in') && event && attendee && (
            <div className="flex flex-col gap-6">
              {/* Event date */}
              <p className="text-sm text-gray-400">
                {new Date(event.start_date).toLocaleDateString('en-PH', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>

              {/* Attendee card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {(attendee.full_name || attendee.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {attendee.full_name || attendee.email}
                  </p>
                  {attendee.full_name && (
                    <p className="text-xs text-gray-400 truncate">{attendee.email}</p>
                  )}
                  <span
                    className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tierColors.bg, color: tierColors.text }}
                  >
                    {attendee.ticket_tier}
                  </span>
                </div>
              </div>

              {/* Check-in button */}
              <button
                onClick={handleCheckIn}
                disabled={pageState === 'checking_in'}
                className="w-full py-4 rounded-xl text-white text-base font-semibold tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: primary }}
              >
                {pageState === 'checking_in' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Checking in…
                  </>
                ) : (
                  'Check In Now'
                )}
              </button>
            </div>
          )}

          {pageState === 'done' && event && attendee && (
            <div className="flex flex-col items-center gap-6 text-center">
              {/* Success icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primary }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">Checked In!</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Welcome, <span className="font-medium text-gray-700">{attendee.full_name || attendee.email}</span>
                </p>
              </div>

              <div className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {(attendee.full_name || attendee.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-medium text-gray-900 truncate">{attendee.full_name || attendee.email}</p>
                  {attendee.full_name && (
                    <p className="text-xs text-gray-400 truncate">{attendee.email}</p>
                  )}
                </div>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: tierColors.bg, color: tierColors.text }}
                >
                  {attendee.ticket_tier}
                </span>
              </div>

              {attendee.checked_in_at && (
                <p className="text-xs text-gray-400">
                  Checked in at{' '}
                  {new Date(attendee.checked_in_at).toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          )}

          {pageState === 'not_found' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800">Check-in link not found</h2>
                <p className="text-sm text-gray-400 mt-1">This link may be invalid or expired.</p>
              </div>
            </div>
          )}

          {pageState === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
              <button
                onClick={() => setPageState('ready')}
                className="text-xs text-gray-400 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer brand strip */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
        />
      </div>
    </div>
  )
}
