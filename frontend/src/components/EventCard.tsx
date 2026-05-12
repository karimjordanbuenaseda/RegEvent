import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EventWithStats } from '../api/events'
import { deleteEvent, duplicateEvent } from '../api/events'
import { useEventsStore } from '../store/eventsStore'

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
  const fetch = useEventsStore((s) => s.fetch)

  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  const primary = event.primary_color ?? DEFAULT_PRIMARY
  const accent = event.accent_color ?? DEFAULT_ACCENT

  const formattedDate = new Date(event.start_date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  function copyRegistrationLink() {
    const url = `${window.location.origin}/events/${event.slug}/register`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleDuplicate() {
    setMenuOpen(false)
    setIsDuplicating(true)
    try {
      await duplicateEvent(event.id)
      await fetch()
    } finally {
      setIsDuplicating(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteEvent(event.id)
      await fetch()
    } finally {
      setIsDeleting(false)
      setDelConfirm(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">

      {/* Delete confirmation overlay */}
      {delConfirm && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">Delete event?</p>
            <p className="text-xs text-gray-400 mt-1">All attendees and data will be permanently removed.</p>
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setDelConfirm(false)}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-lg bg-red-500 text-sm text-white font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Cover image / gradient header */}
      <div className="h-28 w-full shrink-0 overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(to right, ${primary}, ${accent})` }}
          />
        )}
      </div>

      {/* Overflow menu — outside overflow-hidden so dropdown can overlap card body */}
      <div className="absolute top-2 right-2 z-10" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          disabled={isDuplicating}
          className="w-7 h-7 rounded-full bg-white shadow-md hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
          title="More options"
        >
          {isDuplicating ? (
            <svg className="w-3.5 h-3.5 text-gray-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
              <button
                onClick={handleDuplicate}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Duplicate
              </button>
              <div className="h-px bg-gray-100 mx-2" />
              <button
                onClick={() => { setMenuOpen(false); setDelConfirm(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
      </div>

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

        <button
          onClick={copyRegistrationLink}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
        >
          {copied ? (
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          <span className={`truncate ${copied ? 'text-green-500' : ''}`}>
            {copied ? 'Link copied!' : `/events/${event.slug}/register`}
          </span>
        </button>
      </div>

    </div>
  )
}
