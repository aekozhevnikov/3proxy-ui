"use client"

import { useState, useCallback } from "react"
import { api } from "@/src/api/client"
import { showToast } from "@/src/core/toast-utils"

export function useMaintenance() {
  const [loading, setLoading] = useState(false)

  const runMaintenance = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.runMaintenance()
      if (response.success) {
        showToast(`Maintenance completed: ${response.updatedCount} updated, ${response.deactivatedCount} deactivated`, "success")
      } else {
        showToast(response.message || "Maintenance failed", "error")
      }
    } catch (err) {
      console.error("Maintenance error:", err)
      showToast("Maintenance failed", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    runMaintenance,
  }
}