"use client"

import { SystemStatus } from '@/components/dashboard/useDashboardData'

interface Props {
  systemStatus: SystemStatus | undefined
}

export default function SystemInfoCard({ systemStatus }: Props) {
  if (!systemStatus) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Info</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Version</span>
          <span className="font-medium text-gray-900 dark:text-white">{systemStatus.version}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Uptime</span>
          <span className="font-medium text-gray-900 dark:text-white">{Math.floor(systemStatus.uptime / 3600)}h {Math.floor((systemStatus.uptime % 3600) / 60)}m</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">OS</span>
          <span className="font-medium text-gray-900 dark:text-white">{systemStatus.os}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Arch</span>
          <span className="font-medium text-gray-900 dark:text-white">{systemStatus.arch}</span>
        </div>
      </div>
    </div>
  )
}