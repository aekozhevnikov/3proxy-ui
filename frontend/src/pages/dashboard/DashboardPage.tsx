"use client";

import { useDashboardData } from '@/hooks/useDashboardData'
import SystemStatusCard from '@/components/dashboard/SystemStatusCard'
import UserSummaryCard from '@/components/dashboard/UserSummaryCard'
import TrafficOverviewCard from '@/components/dashboard/TrafficOverviewCard'
import SystemInfoCard from '@/components/dashboard/SystemInfoCard'

export default function DashboardPage() {
  const { data, loading, refreshing, error, refresh } = useDashboardData()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
          onClick={() => refresh()}
        >
          Retry
        </button>
      </div>
    )
  }

  const handleRefresh = () => {
    refresh()
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 flex flex-col gap-8 mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
        <SystemStatusCard systemStatus={data?.systemStatus} />
        <UserSummaryCard userSummary={data?.userSummary} />
        <TrafficOverviewCard trafficStats={data?.trafficStats} />
        <SystemInfoCard systemStatus={data?.systemStatus} />
      </div>
    </div>
  )
}