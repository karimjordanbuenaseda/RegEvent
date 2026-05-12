import { create } from 'zustand'
import { createEvent, updateEvent, getEventBySlug } from '../api/events'
import { createLayout, updateLayout, getLayoutsForEvent } from '../api/eventLayouts'
import type { ComponentType } from '../api/eventLayouts'

export type { ComponentType }

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const DEFAULT_STYLES = { primary: '#81A6C6', accent: '#AACDDC' }

interface EditorState {
  eventId: string | null
  layoutId: string | null

  title: string
  slug: string
  slugAutoSync: boolean
  startDate: string
  isActive: boolean
  latitude: string
  longitude: string

  structure: ComponentType[]
  styles: { primary: string; accent: string }
  coverImageUrl: string | null

  deviceView: 'mobile' | 'desktop'
  isSaving: boolean
  saveError: string | null

  setTitle: (v: string) => void
  setSlug: (v: string) => void
  setStartDate: (v: string) => void
  setIsActive: (v: boolean) => void
  setLatitude: (v: string) => void
  setLongitude: (v: string) => void
  addComponent: (type: ComponentType) => void
  removeComponent: (index: number) => void
  moveComponent: (from: number, to: number) => void
  setDeviceView: (v: 'mobile' | 'desktop') => void
  setCoverImageUrl: (url: string) => void
  setStyle: (key: 'primary' | 'accent', value: string) => void
  loadExisting: (slug: string) => Promise<void>
  save: () => Promise<string>
  reset: () => void
}

const INITIAL: Pick<
  EditorState,
  'eventId' | 'layoutId' | 'title' | 'slug' | 'slugAutoSync' | 'startDate' |
  'isActive' | 'latitude' | 'longitude' | 'structure' | 'styles' | 'coverImageUrl' |
  'deviceView' | 'isSaving' | 'saveError'
> = {
  eventId: null,
  layoutId: null,
  title: '',
  slug: '',
  slugAutoSync: true,
  startDate: '',
  isActive: true,
  latitude: '',
  longitude: '',
  structure: [],
  styles: { ...DEFAULT_STYLES },
  coverImageUrl: null,
  deviceView: 'desktop',
  isSaving: false,
  saveError: null,
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...INITIAL,

  setTitle: (v) => {
    const { slugAutoSync } = get()
    set({ title: v, ...(slugAutoSync ? { slug: slugify(v) } : {}) })
  },

  setSlug: (v) => set({ slug: v, slugAutoSync: false }),

  setStartDate: (v) => set({ startDate: v }),
  setIsActive: (v) => set({ isActive: v }),
  setLatitude: (v) => set({ latitude: v }),
  setLongitude: (v) => set({ longitude: v }),

  addComponent: (type) => {
    const { structure } = get()
    if (!structure.includes(type)) set({ structure: [...structure, type] })
  },

  removeComponent: (index) => {
    set({ structure: get().structure.filter((_, i) => i !== index) })
  },

  moveComponent: (from, to) => {
    const next = [...get().structure]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    set({ structure: next })
  },

  setDeviceView: (v) => set({ deviceView: v }),
  setCoverImageUrl: (url) => set({ coverImageUrl: url }),
  setStyle: (key, value) => set({ styles: { ...get().styles, [key]: value } }),

  loadExisting: async (slug) => {
    const event = await getEventBySlug(slug)
    const layouts = await getLayoutsForEvent(event.id)
    const layout = layouts[0] ?? null
    set({
      eventId: event.id,
      layoutId: layout?.id ?? null,
      title: event.title,
      slug: event.slug,
      slugAutoSync: false,
      startDate: event.start_date.slice(0, 16),
      isActive: event.is_active,
      latitude: event.latitude?.toString() ?? '',
      longitude: event.longitude?.toString() ?? '',
      structure: (layout?.structure as ComponentType[]) ?? [],
      styles: layout?.styles
        ? { primary: layout.styles.primary ?? DEFAULT_STYLES.primary, accent: layout.styles.accent ?? DEFAULT_STYLES.accent }
        : { ...DEFAULT_STYLES },
      coverImageUrl: layout?.cover_image_url ?? null,
    })
  },

  save: async () => {
    const state = get()
    if (!state.title.trim() || !state.slug.trim() || !state.startDate) {
      throw new Error('Title, slug, and start date are required')
    }
    set({ isSaving: true, saveError: null })
    try {
      const eventPayload = {
        title: state.title.trim(),
        slug: state.slug.trim(),
        start_date: new Date(state.startDate).toISOString(),
        is_active: state.isActive,
        latitude: state.latitude ? parseFloat(state.latitude) : null,
        longitude: state.longitude ? parseFloat(state.longitude) : null,
      }

      let eventId = state.eventId
      if (eventId) {
        await updateEvent(eventId, eventPayload)
      } else {
        const created = await createEvent(eventPayload)
        eventId = created.id
        set({ eventId: created.id })
      }

      const layoutPayload = {
        structure: state.structure,
        styles: state.styles,
        cover_image_url: state.coverImageUrl,
      }

      if (state.layoutId) {
        await updateLayout(state.layoutId, layoutPayload)
      } else {
        const created = await createLayout({ event_id: eventId!, layout_name: 'Default', ...layoutPayload })
        set({ layoutId: created.id })
      }

      set({ isSaving: false })
      return state.slug.trim()
    } catch (err) {
      set({ isSaving: false, saveError: (err as Error).message })
      throw err
    }
  },

  reset: () => set({ ...INITIAL, styles: { ...DEFAULT_STYLES } }),
}))
