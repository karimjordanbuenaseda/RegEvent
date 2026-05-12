import { useEffect } from 'react'
import { useActivityStore } from '../store/activityStore'
import type { ActivityItem } from '../api/activity'

const POLL_INTERVAL = 15_000

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isCheckIn = item.type === 'check_in'
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
        isCheckIn ? 'bg-green-100 text-green-600' : 'bg-brand-accent/30 text-brand-primary'
      }`}>
        {isCheckIn ? '✓' : '+'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.attendee_name}</p>
        <p className="text-xs text-gray-400 truncate">
          {isCheckIn ? 'checked in at' : 'registered for'}{' '}
          <span className="text-gray-500">{item.event_title}</span>
        </p>
      </div>
      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-10 shrink-0" />
    </div>
  )
}

export default function ActivityFeed() {
  const { items, isLoading, error, fetch } = useActivityStore()

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetch])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h2 className="text-base font-semibold text-gray-800">Live Activity</h2>
      </div>

      {error ? (
        <p className="text-sm text-red-500 py-2">Could not load activity.</p>
      ) : isLoading && items.length === 0 ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No recent activity.</p>
      ) : (
        <div>
          {items.map((item, i) => <ActivityRow key={i} item={item} />)}
        </div>
      )}
    </div>
  )
}
