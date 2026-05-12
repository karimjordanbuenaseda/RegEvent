import TopNav from '../components/TopNav'
import MetricRibbon from '../components/MetricRibbon'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        <MetricRibbon />
      </main>
    </div>
  )
}
