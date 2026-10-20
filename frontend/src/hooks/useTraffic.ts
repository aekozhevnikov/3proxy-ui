"use client"

import { useState, useEffect, useCallback } from "react"
import { api, TrafficStats } from "@/src/api/client"

export function useTraffic() {
  const [traffic, setTraffic] = useState<Record<string, TrafficStats>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTraffic = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.getTraffic()
      setTraffic(response)
    } catch (err) {
      console.error("Error fetching traffic:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch traffic")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTraffic()
    const interval = setInterval(fetchTraffic, 30000)
    return () => clearInterval(interval)
  }, [fetchTraffic])

  return {
    traffic,
    loading,
    error,
    refetch: fetchTraffic,
  }
}