"use client"

import { UserSummary } from '@/components/dashboard/useDashboardData'

interface Props {
  userSummary: UserSummary | undefined
}

export default function UserSummaryCard({ userSummary }: Props) {
  if (!userSummary) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{userSummary.total}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userSummary.active}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{userSummary.expired}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Deactivated</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{userSummary.deactivated}</p>
        </div>
      </div>
    </div>
  )
}