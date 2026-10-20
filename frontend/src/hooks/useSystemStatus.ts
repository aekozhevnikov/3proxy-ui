"use client"

import { useState, useEffect, useCallback } from "react"

import { api, SystemStatus, HealthResponse } from "@/src/api/client"

export function useSystemStatus() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getSystemStatus()
      if (response.success) {
        setStatus(response.status)
      } else {
        throw new Error("Failed to fetch status")
      }
    } catch (err) {
      console.error("Error fetching system status:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch system status")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHealth = useCallback(async () => {
    try {
      const response = await api.getHealth()
      setHealth(response)
    } catch (err) {
      console.error("Error fetching health:", err)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchHealth()
    const interval = setInterval(() => {
      fetchStatus()
      fetchHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus, fetchHealth])

  return {
    status,
    health,
    loading,
    error,
    refetch: fetchStatus,
  }
}
