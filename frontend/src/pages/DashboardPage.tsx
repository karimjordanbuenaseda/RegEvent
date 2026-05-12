import TopNav from '../components/TopNav'
import MetricRibbon from '../components/MetricRibbon'
import EventsGrid from '../components/EventsGrid'
import ActivityFeed from '../components/ActivityFeed'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        <MetricRibbon />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <EventsGrid />
          </div>
          <aside className="lg:w-80 shrink-0">
            <ActivityFeed />
          </aside>
        </div>
      </main>
    </div>
  )
}
