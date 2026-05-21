import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { fetchMyEvents } from '../api/events'
import { drawWinner } from '../api/raffle'
import type { RaffleWinner } from '../api/raffle'
import { listAttendees } from '../api/attendees'

type DrawPhase = 'ready' | 'spinning' | 'slowing' | 'revealed' | 'error'

export default function RaffleDrawPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()

  const eligibility = (searchParams.get('eligibility') ?? 'checked_in') as
    | 'checked_in'
    | 'registered'
    | 'both'
  const prizeId = searchParams.get('prize_id') ?? undefined
  const includeWinners = searchParams.get('include_winners') === 'true'

  const [eventTitle, setEventTitle] = useState<string>('')
  const [eventId, setEventId] = useState<string>('')
  const [poolSize, setPoolSize] = useState<number | null>(null)
  const [phase, setPhase] = useState<DrawPhase>('ready')
  const [displayName, setDisplayName] = useState('')
  const [winner, setWinner] = useState<RaffleWinner | null>(null)
  const [flash, setFlash] = useState(false)
  const [blurred, setBlurred] = useState(false)
  const [drawError, setDrawError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<DrawPhase>('ready')
  const winnerRef = useRef<string>('')
  const delayRef = useRef<number>(55)
  const namesRef = useRef<string[]>([])

  // Load event info and attendee name pool
  useEffect(() => {
    if (!slug) return
    fetchMyEvents()
      .then((events) => {
        const match = events.find((e) => e.slug === slug)
        if (match) {
          setEventTitle(match.title)
          setEventId(match.id)
          return listAttendees(match.id)
        }
        return Promise.resolve([])
      })
      .then((attendees) => {
        const pool = attendees
          .filter((a) => includeWinners || !a.has_won)
          .filter((a) => eligibility !== 'checked_in' || a.check_in_status)
          .map((a) => a.full_name || a.email)
          .filter(Boolean) as string[]
        namesRef.current = pool
        setPoolSize(pool.length)
      })
      .catch(() => { setPoolSize(0) })
  }, [slug])

  function pickRandom(): string {
    const pool = namesRef.current
    if (!pool.length) return 'Drawing…'
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function stopLoop() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const tickRef = useRef<() => void>(() => {})
  tickRef.current = () => {
    const p = phaseRef.current
    if (p !== 'spinning' && p !== 'slowing') return

    if (p === 'spinning') {
      setDisplayName(pickRandom())
      setBlurred((b) => !b)
      timerRef.current = setTimeout(() => tickRef.current(), delayRef.current)
    } else {
      delayRef.current = Math.min(delayRef.current * 1.22, 750)
      if (delayRef.current >= 750) {
        phaseRef.current = 'revealed'
        setPhase('revealed')
        setDisplayName(winnerRef.current)
        setBlurred(false)
        setFlash(true)
        timerRef.current = null
        setTimeout(() => setFlash(false), 900)
      } else {
        setDisplayName(pickRandom())
        setBlurred(delayRef.current < 300)
        timerRef.current = setTimeout(() => tickRef.current(), delayRef.current)
      }
    }
  }

  useEffect(() => () => stopLoop(), [])

  async function handleStart() {
    if (!eventId || poolSize === null) return
    setDrawError(null)
    setWinner(null)

    // Start animation
    stopLoop()
    phaseRef.current = 'spinning'
    delayRef.current = 55
    setPhase('spinning')
    setFlash(false)
    setBlurred(false)
    setDisplayName(pickRandom())
    timerRef.current = setTimeout(() => tickRef.current(), 55)

    try {
      const result = await drawWinner(eventId, { eligibility, prize_id: prizeId, include_winners: includeWinners || undefined })
      winnerRef.current = result.full_name || result.email
      setWinner(result)
      if ((phaseRef.current as DrawPhase) !== 'revealed') {
        phaseRef.current = 'slowing'
        setPhase('slowing')
      }
    } catch (err) {
      stopLoop()
      phaseRef.current = 'error'
      setPhase('error')
      setBlurred(false)
      const msg = (err as Error).message ?? ''
      setDrawError(
        msg.toLowerCase().includes('no eligible')
          ? 'No eligible attendees for this draw.'
          : 'Draw failed — please try again.',
      )
    }
  }

  function handleDrawAgain() {
    stopLoop()
    phaseRef.current = 'ready'
    setPhase('ready')
    setWinner(null)
    setDisplayName('')
    setFlash(false)
    setBlurred(false)
    setDrawError(null)
    setPoolSize(null)
    if (eventId) {
      listAttendees(eventId)
        .then((a) => {
          const pool = a
            .filter((x) => includeWinners || !x.has_won)
            .filter((x) => eligibility !== 'checked_in' || x.check_in_status)
            .map((x) => x.full_name || x.email)
            .filter(Boolean) as string[]
          namesRef.current = pool
          setPoolSize(pool.length)
        })
        .catch(() => { setPoolSize(0) })
    }
  }

  const isVip = winner?.ticket_tier === 'VIP'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#0f172a' }}
    >
      {/* Event label */}
      {eventTitle && (
        <p className="text-sm font-medium tracking-widest uppercase mb-8" style={{ color: '#64748b' }}>
          {eventTitle}
        </p>
      )}

      {/* ── Ready state ── */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Raffle Draw</h1>
            <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
              {poolSize === null
                ? 'Loading participants…'
                : poolSize === 0
                ? 'No eligible participants for this draw.'
                : `${poolSize} eligible participant${poolSize !== 1 ? 's' : ''} in the pool.`}
            </p>
          </div>

          {drawError && (
            <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-center">
              {drawError}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={poolSize === null || poolSize === 0}
            className="w-full py-5 rounded-2xl text-lg font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg, #81A6C6, #AACDDC)' }}
          >
            {poolSize === null ? 'Loading…' : 'Start Draw'}
          </button>
        </div>
      )}

      {/* ── Spinning / Slowing ── */}
      {(phase === 'spinning' || phase === 'slowing') && (
        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-xs tracking-widest uppercase" style={{ color: '#64748b' }}>
            {phase === 'spinning' ? 'Randomizing…' : 'Locking in…'}
          </p>
          <div
            className="text-center select-none"
            style={{
              filter: blurred ? 'blur(6px)' : 'blur(0)',
              transform: blurred ? 'scale(0.95)' : 'scale(1)',
              transition: blurred ? 'none' : 'filter 0.12s ease, transform 0.12s ease',
              opacity: blurred ? 0.6 : 1,
            }}
          >
            <p
              className="font-extrabold leading-none"
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 5rem)',
                color: '#f1f5f9',
              }}
            >
              {displayName}
            </p>
          </div>
        </div>
      )}

      {/* ── Revealed ── */}
      {phase === 'revealed' && winner && (
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          {/* Prize image */}
          {winner.prize_image_url && (
            <img
              src={winner.prize_image_url}
              alt={winner.prize_title ?? 'Prize'}
              className="rounded-2xl object-cover border border-slate-700 shadow-lg"
              style={{
                width: 'clamp(160px, 30vw, 240px)',
                height: 'clamp(160px, 30vw, 240px)',
                transition: 'box-shadow 0.6s ease',
                boxShadow: flash ? '0 0 40px rgba(129,166,198,0.55)' : undefined,
              }}
            />
          )}

          {/* Winner name */}
          <div className="text-center">
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: '#81A6C6' }}>
              Winner
            </p>
            <p
              className="font-extrabold leading-tight transition-colors duration-700"
              style={{
                fontSize: 'clamp(2rem, 6vw, 4rem)',
                color: flash ? '#81A6C6' : '#f1f5f9',
              }}
            >
              {winner.full_name || winner.email}
            </p>
            {winner.full_name && (
              <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
                {winner.email}
              </p>
            )}
          </div>

          {/* Prize title */}
          {winner.prize_title && (
            <p className="text-base font-semibold text-center" style={{ color: '#f1f5f9' }}>
              {winner.prize_title}
            </p>
          )}

          {/* Ticket tier badge */}
          <span
            className={`text-sm font-semibold px-4 py-1.5 rounded-full ${
              isVip ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {winner.ticket_tier}
          </span>

          {/* Notification note */}
          <p className="text-xs text-center" style={{ color: '#475569' }}>
            A winner notification has been sent to their email.
          </p>

          {/* Draw again */}
          <button
            onClick={handleDrawAgain}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white border border-slate-600 hover:border-slate-400 transition-colors"
            style={{ background: 'transparent' }}
          >
            Draw Again
          </button>
        </div>
      )}

      {/* ── Error state ── */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center">
          <p className="text-red-400">{drawError}</p>
          <button
            onClick={handleDrawAgain}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white border border-slate-600 hover:border-slate-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
