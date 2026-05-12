import { useEffect } from 'react'
import { useStatsStore } from '../store/statsStore'

const POLL_INTERVAL = 30_000

interface MetricCardProps {
  label: string
  value: number | undefined
  subtext: string
  isLoading: boolean
  accentColor: string
}

function MetricCard({ label, value, subtext, isLoading, accentColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-1">
      <div className={`w-8 h-1 rounded-full mb-3 ${accentColor}`} />
      <span className="text-sm font-medium text-gray-500">{label}</span>
      {isLoading ? (
        <div className="h-10 w-20 bg-gray-100 rounded-lg animate-pulse mt-1" />
      ) : (
        <span className="text-4xl font-bold text-brand-primary leading-none mt-1">
          {value ?? 0}
        </span>
      )}
      <span className="text-xs text-gray-400 mt-1">{subtext}</span>
    </div>
  )
}

export default function MetricRibbon() {
  const { stats, isLoading, error, fetch } = useStatsStore()

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetch])

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
        Could not load dashboard stats.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        label="Total Live Events"
        value={stats?.total_live_events}
        subtext="events currently active"
        isLoading={isLoading}
        accentColor="bg-brand-primary"
      />
      <MetricCard
        label="Total Attendees"
        value={stats?.total_attendees}
        subtext="registered across all events"
        isLoading={isLoading}
        accentColor="bg-brand-accent"
      />
      <MetricCard
        label="Prizes Awarded"
        value={stats?.total_prizes_awarded}
        subtext="winners from raffle draws"
        isLoading={isLoading}
        accentColor="bg-brand-card"
      />
    </div>
  )
}
