"use client"

import { useState, useEffect, useCallback } from "react"
import { api, LogEntry } from "@/src/api/client"

interface LogFilter {
  startDate?: string
  endDate?: string
  username?: string
  logType?: "all" | "PROXY" | "SOCKS" | "ADMIN"
  limit?: number
  offset?: number
}

interface LogsResponse {
  success: boolean
  logs: LogEntry[]
  total: number
  filesScanned: number
  availableDates: string[]
  stats: {
    totalLogs: number
    dateRange: {
      earliest: string | null
      latest: string | null
    }
    files: number
    size: number
  }
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [filesScanned, setFilesScanned] = useState(0)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [stats, setStats] = useState<LogsResponse["stats"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async (filter: LogFilter = {}) => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getLogs(filter)

      if (response.success) {
        setLogs(response.logs)
        setTotal(response.total)
        setFilesScanned(response.filesScanned)
        setAvailableDates(response.availableDates)
        setStats(response.stats)
      } else {
        throw new Error("Failed to fetch logs")
      }
    } catch (err) {
      console.error("Error fetching logs:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(() => fetchLogs(), 30000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  return {
    logs,
    total,
    filesScanned,
    availableDates,
    stats,
    loading,
    error,
    fetchLogs,
  }
}