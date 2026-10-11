import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

export interface SystemStatus {
  version: string
  uptime: number
  os: string
  arch: string
}

export interface UserSummary {
  total: number
  active: number
  expired: number
  deactivated: number
}

export interface TrafficStats {
  totalUpload: number
  totalDownload: number
  todayUpload: number
  todayDownload: number
}

export interface DashboardData {
  systemStatus: SystemStatus
  userSummary: UserSummary
  trafficStats: TrafficStats
}

export function useDashboardData() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const refresh = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    data,
    loading: isLoading,
    refreshing: false,
    error: isError ? (error as Error).message : null,
    refresh,
  }
}