"use client"

import { TrafficStats } from '@/components/dashboard/useDashboardData'

interface Props {
  trafficStats: TrafficStats | undefined
}

export default function TrafficOverviewCard({ trafficStats }: Props) {
  if (!trafficStats) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Traffic Overview</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Upload</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{trafficStats.totalUpload} MB</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Download</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{trafficStats.totalDownload} MB</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Today Upload</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{trafficStats.todayUpload} MB</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Today Download</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{trafficStats.todayDownload} MB</p>
        </div>
      </div>
    </div>
  )
}