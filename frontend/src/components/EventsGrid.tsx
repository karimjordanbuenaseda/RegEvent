import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchMyEvents } from '../api/events'
import EventCard from './EventCard'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="h-5 bg-gray-100 rounded w-2/3" />
        <div className="h-5 bg-gray-100 rounded w-14" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/3" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-1.5 bg-gray-100 rounded w-full" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="flex-1 h-9 bg-gray-100 rounded-lg" />
        <div className="flex-1 h-9 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}

export default function EventsGrid() {
  const navigate = useNavigate()
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['my-events'],
    queryFn: fetchMyEvents,
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Your Events</h2>
        <button
          onClick={() => navigate('/events/new')}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-primary text-white hover:opacity-90 transition-opacity"
        >
          + Create New Event
        </button>
      </div>

      {isError ? (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          Could not load events.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : events?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <p className="text-gray-400 text-sm">No events yet.</p>
          <button
            onClick={() => navigate('/events/new')}
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events?.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      )}

    </div>
  )
}
