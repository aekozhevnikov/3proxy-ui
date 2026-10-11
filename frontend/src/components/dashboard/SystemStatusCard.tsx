"use client"

import { SystemStatus } from '@/components/dashboard/useDashboardData'

interface Props {
  systemStatus: SystemStatus | undefined
}

export default function SystemStatusCard({ systemStatus }: Props) {
  if (!systemStatus) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">System Running</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  )
}