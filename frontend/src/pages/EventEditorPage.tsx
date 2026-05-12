import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopNav from '../components/TopNav'
import { useEditorStore } from '../store/editorStore'
import { uploadEventCover } from '../api/uploads'
import type { ComponentType } from '../api/eventLayouts'
import { listAttendees, inviteAttendee } from '../api/attendees'
import type { Attendee, TicketTier } from '../api/attendees'

// ─── constants ────────────────────────────────────────────────────────────────

const COMP_META: Record<ComponentType, { label: string; description: string }> = {
  hero:              { label: 'Hero Banner',       description: 'Full-width image banner with event title' },
  registration_form: { label: 'Registration Form', description: 'Attendee sign-up form' },
  map:               { label: 'Map',               description: 'Event location & directions' },
  countdown:         { label: 'Countdown',         description: 'Live countdown to event start' },
}

const COMP_ORDER: ComponentType[] = ['hero', 'registration_form', 'map', 'countdown']

const INPUT_CLS =
  'w-full px-2.5 py-1.5 rounded-lg border border-[#D2C4B4] bg-white text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-1 focus:ring-[#81A6C6]/50 focus:border-[#81A6C6] transition-colors'

// ─── component previews ───────────────────────────────────────────────────────

function HeroPreview({
  styles,
  coverImageUrl,
}: {
  styles: { primary: string; accent: string }
  coverImageUrl?: string | null
}) {
  return (
    <div
      className="w-full h-36 flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
      style={
        coverImageUrl
          ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: `linear-gradient(135deg, ${styles.primary}, ${styles.accent})` }
      }
    >
      {coverImageUrl ? (
        <div className="absolute inset-0 bg-black/35" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-10 text-white">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
      )}
      <p className="relative text-white font-bold text-lg drop-shadow-sm">Event Title</p>
      <p className="relative text-white/75 text-xs">Date · Venue</p>
    </div>
  )
}

function RegFormPreview({ styles }: { styles: { primary: string; accent: string } }) {
  return (
    <div className="w-full px-6 py-4 flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-gray-700">Register Now</p>
      {['Full Name', 'Email Address'].map((ph) => (
        <div key={ph} className="h-7 rounded border border-gray-200 bg-gray-50 px-2 flex items-center">
          <span className="text-xs text-gray-400">{ph}</span>
        </div>
      ))}
      <div
        className="mt-1 h-8 rounded flex items-center justify-center text-white text-xs font-medium"
        style={{ backgroundColor: styles.primary }}
      >
        Register
      </div>
    </div>
  )
}

function MapPreview() {
  return (
    <div className="w-full h-28 bg-[#E8F0E8] relative overflow-hidden flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(#8CA880 1px, transparent 1px), linear-gradient(90deg, #8CA880 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative flex flex-col items-center gap-1">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#E53E3E">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="text-xs text-gray-600 font-medium">Event Location</span>
      </div>
    </div>
  )
}

function CountdownPreview({ styles }: { styles: { primary: string; accent: string } }) {
  return (
    <div className="w-full px-6 py-4 flex flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-wider text-gray-400">Event starts in</p>
      <div className="flex items-end gap-3">
        {[['00', 'Days'], ['00', 'Hours'], ['00', 'Mins'], ['00', 'Secs']].map(([val, label]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-base font-bold"
              style={{ backgroundColor: styles.primary }}
            >
              {val}
            </div>
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompPreview({
  type,
  styles,
  coverImageUrl,
}: {
  type: ComponentType
  styles: { primary: string; accent: string }
  coverImageUrl?: string | null
}) {
  if (type === 'hero') return <HeroPreview styles={styles} coverImageUrl={coverImageUrl} />
  if (type === 'registration_form') return <RegFormPreview styles={styles} />
  if (type === 'map') return <MapPreview />
  return <CountdownPreview styles={styles} />
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{children}</p>
  )
}

// ─── canvas tile ──────────────────────────────────────────────────────────────

interface TileProps {
  type: ComponentType
  isOver: boolean
  isDragging: boolean
  styles: { primary: string; accent: string }
  coverImageUrl?: string | null
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onRemove: () => void
}

function CanvasTile(props: TileProps) {
  const { type, isOver, isDragging, styles, coverImageUrl, onDragStart, onDragOver, onDrop, onDragEnd, onRemove } = props
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        'relative group cursor-grab active:cursor-grabbing select-none',
        'border-b border-gray-100 last:border-b-0 transition-all',
        isDragging ? 'opacity-30' : 'opacity-100',
        isOver ? 'outline outline-2 outline-offset-[-2px] outline-[#81A6C6]/50' : '',
      ].join(' ')}
    >
      <CompPreview type={type} styles={styles} coverImageUrl={coverImageUrl} />

      {/* Hover overlay */}
      <div className="absolute inset-0 pointer-events-none group-hover:bg-black/[0.04] transition-colors" />

      {/* Controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="pointer-events-none bg-white/90 border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-500 font-medium shadow-sm">
          {COMP_META[type].label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="pointer-events-auto w-6 h-6 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center text-sm text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
        >
          ×
        </button>
      </div>

      {/* Drag handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none text-gray-600 text-lg">
        ⠿
      </div>
    </div>
  )
}

// ─── left panel ───────────────────────────────────────────────────────────────

function LeftPanel() {
  const {
    title, slug, startDate, isActive, latitude, longitude, structure,
    setTitle, setSlug, setStartDate, setIsActive, setLatitude, setLongitude,
    addComponent,
  } = useEditorStore()

  const [coordsInput, setCoordsInput] = useState('')
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!isInitialized.current && (latitude || longitude)) {
      isInitialized.current = true
      setCoordsInput(latitude && longitude ? `${latitude}, ${longitude}` : latitude || longitude)
    }
  }, [latitude, longitude])

  function handleCoordsChange(val: string) {
    setCoordsInput(val)
    const match = val.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (match) {
      setLatitude(match[1])
      setLongitude(match[2])
    } else if (!val.trim()) {
      setLatitude('')
      setLongitude('')
    }
  }

  const coordsValid = !coordsInput.trim() || /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/.test(coordsInput.trim())

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-[#F3E3D0] border-b border-[#D2C4B4] lg:border-b-0 lg:border-r lg:overflow-y-auto">
      {/* Event details */}
      <div className="p-5 flex flex-col gap-4">
        <SectionLabel>Event Details</SectionLabel>

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Event"
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-awesome-event"
            className={INPUT_CLS + ' font-mono text-xs'}
          />
        </Field>

        <Field label="Start Date & Time">
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={INPUT_CLS}
          />
        </Field>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Status</span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isActive ? 'Live' : 'Inactive'}
          </button>
        </div>

        <Field label="Coordinates">
          <input
            value={coordsInput}
            onChange={(e) => handleCoordsChange(e.target.value)}
            placeholder="14.5995, 120.9842"
            className={INPUT_CLS + ' text-xs' + (!coordsValid ? ' border-red-400 focus:border-red-400 focus:ring-red-200/50' : '')}
          />
          {!coordsValid && (
            <p className="text-[10px] text-red-400 mt-0.5">Enter as: latitude, longitude</p>
          )}
        </Field>

        <a
          href={
            latitude && longitude
              ? `https://maps.google.com/maps?q=${latitude},${longitude}`
              : 'https://maps.google.com'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#D2C4B4] bg-white hover:bg-white/80 text-xs text-[#81A6C6] transition-colors w-full"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          Open in Google Maps
        </a>
      </div>

      <div className="h-px bg-[#D2C4B4] mx-4" />

      {/* Component tray */}
      <div className="p-5 flex flex-col gap-3">
        <SectionLabel>Components</SectionLabel>
        <p className="text-xs text-gray-400 leading-relaxed">
          Click to add. Drag in the canvas to reorder.
        </p>

        <div className="flex flex-col gap-2">
          {COMP_ORDER.map((type) => {
            const added = structure.includes(type)
            return (
              <button
                key={type}
                onClick={() => addComponent(type)}
                disabled={added}
                className={`flex items-start p-3 rounded-xl border text-left transition-all ${
                  added
                    ? 'border-[#D2C4B4] bg-white/30 opacity-50 cursor-not-allowed'
                    : 'border-[#D2C4B4] bg-white hover:bg-[#AACDDC]/30 hover:border-[#81A6C6] active:scale-[0.98]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-700">{COMP_META[type].label}</p>
                    <span className={`text-[10px] font-medium shrink-0 ${added ? 'text-green-600' : 'text-[#81A6C6]'}`}>
                      {added ? '✓ Added' : '+ Add'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{COMP_META[type].description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

// ─── canvas panel ─────────────────────────────────────────────────────────────

function CanvasPanel() {
  const { structure, styles, coverImageUrl, deviceView, removeComponent, moveComponent, setDeviceView } = useEditorStore()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  return (
    <main className="flex-1 min-w-0 flex flex-col lg:overflow-hidden bg-[#EDE5D8]">
      {/* Device toggle */}
      <div className="flex items-center justify-center gap-1 px-4 py-2.5 border-b border-[#D2C4B4] bg-[#F3E3D0] shrink-0">
        {([['desktop', 'Desktop'], ['mobile', 'Mobile']] as const).map(([view, label]) => (
          <button
            key={view}
            onClick={() => setDeviceView(view)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              deviceView === view
                ? 'bg-white text-gray-800 shadow-sm border border-[#D2C4B4]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Scrollable canvas area */}
      <div className="flex-1 lg:overflow-auto p-6 flex justify-center items-start">
        <div
          className={`bg-white shadow-lg overflow-hidden transition-all duration-300 ${
            deviceView === 'mobile'
              ? 'w-full max-w-sm rounded-3xl border-4 border-gray-800'
              : 'w-full max-w-2xl rounded-xl'
          }`}
        >
          {structure.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 px-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl text-gray-300 font-light">
                +
              </div>
              <p className="text-sm text-gray-400">Your canvas is empty</p>
              <p className="text-xs text-gray-300">Add components from the left tray</p>
            </div>
          ) : (
            structure.map((type, i) => (
              <CanvasTile
                key={`${type}-${i}`}
                type={type}
                styles={styles}
                coverImageUrl={coverImageUrl}
                isOver={overIdx === i && dragIdx !== null && dragIdx !== i}
                isDragging={dragIdx === i}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== i) moveComponent(dragIdx, i)
                  setDragIdx(null)
                  setOverIdx(null)
                }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                onRemove={() => removeComponent(i)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  )
}

// ─── attendees panel ──────────────────────────────────────────────────────────

function AttendeesPanel({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [tier, setTier] = useState<TicketTier>('General')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => { reload() }, [eventId])  // eslint-disable-line react-hooks/exhaustive-deps

  async function reload() {
    setLoading(true)
    try {
      const list = await listAttendees(eventId)
      setAttendees(list)
    } catch {
      // silently fail — list stays empty
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    try {
      await inviteAttendee({ event_id: eventId, email, full_name: fullName || undefined, ticket_tier: tier })
      setEmail('')
      setFullName('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
      reload()
    } catch (err) {
      setInviteError((err as Error).message)
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="p-5 flex flex-col gap-4 overflow-y-auto">
      <SectionLabel>Invite Attendee</SectionLabel>
      <form onSubmit={handleInvite} className="flex flex-col gap-3">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="attendee@example.com"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Full Name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan dela Cruz"
            className={INPUT_CLS}
          />
        </Field>
        <div className="flex gap-2">
          {(['General', 'VIP'] as TicketTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className="flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all"
              style={
                tier === t
                  ? { backgroundColor: '#81A6C6', borderColor: '#81A6C6', color: '#fff' }
                  : { borderColor: '#D2C4B4', color: '#6b7280', backgroundColor: '#fff' }
              }
            >
              {t}
            </button>
          ))}
        </div>
        {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
        {inviteSuccess && <p className="text-xs text-green-600">Invite sent!</p>}
        <button
          type="submit"
          disabled={inviting || !email.trim()}
          className="py-2 rounded-lg bg-[#81A6C6] text-white text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {inviting ? 'Sending…' : 'Send Invite'}
        </button>
      </form>

      <div className="h-px bg-[#D2C4B4]" />

      <SectionLabel>Attendees ({attendees.length})</SectionLabel>
      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3].map((n) => <div key={n} className="h-10 bg-white/60 rounded-lg" />)}
        </div>
      ) : attendees.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No attendees yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attendees.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 border border-[#D2C4B4]">
              <div className="w-7 h-7 rounded-full bg-[#81A6C6]/20 flex items-center justify-center text-[10px] font-semibold text-[#81A6C6] shrink-0">
                {(a.full_name || a.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-800 truncate">{a.full_name || a.email}</p>
                {a.full_name && <p className="text-[10px] text-gray-400 truncate">{a.email}</p>}
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                  a.check_in_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {a.check_in_status ? 'Checked in' : 'Registered'}
                </span>
                <span className="text-[9px] text-gray-300">{a.ticket_tier}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── right panel ──────────────────────────────────────────────────────────────

function RightPanel() {
  const { styles, setStyle, coverImageUrl, setCoverImageUrl, eventId } = useEditorStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'design' | 'attendees'>('design')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !eventId) return
    setUploading(true)
    setUploadError(null)
    try {
      const { url } = await uploadEventCover(eventId, file)
      setCoverImageUrl(url)
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-[#F3E3D0] border-t border-[#D2C4B4] lg:border-t-0 lg:border-l flex flex-col lg:overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#D2C4B4] shrink-0">
        {(['design', ...(eventId ? ['attendees'] : [])] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'design' | 'attendees')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'text-gray-800 border-b-2 border-[#81A6C6] bg-white/40'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'design' ? 'Design' : 'Attendees'}
          </button>
        ))}
      </div>

      {activeTab === 'attendees' && eventId ? (
        <div className="flex-1 lg:overflow-y-auto">
          <AttendeesPanel eventId={eventId} />
        </div>
      ) : (
        <div className="flex-1 lg:overflow-y-auto">
          {/* Brand colors */}
          <div className="p-5 flex flex-col gap-4">
            <SectionLabel>Brand Colors</SectionLabel>

            {(['primary', 'accent'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-600 capitalize">{key}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{styles[key]}</p>
                </div>
                <label className="w-9 h-9 rounded-lg border border-[#D2C4B4] overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#81A6C6]/30 transition-shadow shrink-0">
                  <input
                    type="color"
                    value={styles[key]}
                    onChange={(e) => setStyle(key, e.target.value)}
                    className="w-12 h-12 -translate-x-1 -translate-y-1 cursor-pointer"
                  />
                </label>
              </div>
            ))}

            {/* Color preview strip */}
            <div className="h-5 rounded-lg overflow-hidden border border-[#D2C4B4] flex">
              <div className="flex-1 transition-colors" style={{ backgroundColor: styles.primary }} />
              <div className="flex-1 transition-colors" style={{ backgroundColor: styles.accent }} />
            </div>
          </div>

          <div className="h-px bg-[#D2C4B4] mx-4" />

          {/* Cover image */}
          <div className="p-5 flex flex-col gap-3">
            <SectionLabel>Cover Image</SectionLabel>

            {!eventId ? (
              <p className="text-xs text-gray-400 bg-white/60 rounded-xl p-3 border border-[#D2C4B4] leading-relaxed">
                Save the event first to upload a cover image.
              </p>
            ) : coverImageUrl ? (
              <div className="flex flex-col gap-2">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-32 object-cover rounded-xl border border-[#D2C4B4]"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-medium py-2 rounded-lg border border-[#D2C4B4] bg-white text-gray-600 hover:bg-white/80 transition-colors"
                >
                  Replace Image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-[#D2C4B4] bg-white/40 hover:bg-white/70 disabled:opacity-60 transition-colors text-gray-400 hover:text-gray-600 w-full"
              >
                {uploading ? (
                  <p className="text-xs">Uploading…</p>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4-4 4M12 4v12" />
                    </svg>
                    <span className="text-xs font-medium">Upload Cover Image</span>
                    <span className="text-[10px]">JPEG, PNG, WebP · Max 5 MB</span>
                  </>
                )}
              </button>
            )}

            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </div>
      )}
    </aside>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EventEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { title, isSaving, saveError, loadExisting, reset, save } = useEditorStore()

  useEffect(() => {
    reset()
    if (slug) loadExisting(slug).catch(() => navigate('/'))
  }, [slug])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    try {
      const savedSlug = await save()
      if (!slug) navigate(`/events/${savedSlug}/edit`, { replace: true })
    } catch {
      // saveError is set in the store
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:h-screen lg:overflow-hidden">
      <TopNav />

      {/* Editor header */}
      <div className="bg-white border-b border-[#D2C4B4] px-6 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0 mr-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Event Editor</p>
          <h1 className="text-sm font-semibold text-gray-900 truncate">{title || 'New Event'}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {saveError && (
            <p className="text-xs text-red-500 max-w-[200px] truncate hidden sm:block">{saveError}</p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="px-5 py-2 rounded-lg bg-[#81A6C6] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
          >
            {isSaving ? 'Saving…' : slug ? 'Save Changes' : 'Save Event'}
          </button>
        </div>
      </div>

      {/* Three-panel editor */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        <LeftPanel />
        <CanvasPanel />
        <RightPanel />
      </div>
    </div>
  )
}
