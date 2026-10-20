"use client"

import { useState, useCallback } from "react"
import { api, ConfigGenerateResponse, ProxyConfigResponse } from "@/src/api/client"
import { showToast } from "@/src/core/toast-utils"

export function useConfig() {
  const [config, setConfig] = useState<string>("")
  const [proxyConfig, setProxyConfig] = useState<ProxyConfigResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const generateConfig = useCallback(async () => {
    setGenerating(true)
    try {
      const response = await api.generateConfig()
      if (response.success) {
        setConfig(response.config)
        showToast(`Config generated (${response.userCount} users)`, "success")
      } else {
        showToast("Failed to generate config", "error")
      }
    } catch (err) {
      console.error("Generate config error:", err)
      showToast("Failed to generate config", "error")
    } finally {
      setGenerating(false)
    }
  }, [])

  const reloadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.reloadConfig()
      if (response.success) {
        showToast("Configuration reloaded successfully!", "success")
      } else {
        showToast(response.message || "Failed to reload configuration", "error")
      }
    } catch {
      showToast("Failed to reload configuration", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProxyConfig = useCallback(async () => {
    try {
      const response = await api.getProxyConfig()
      setProxyConfig(response)
    } catch (err) {
      console.error("Fetch proxy config error:", err)
    }
  }, [])

  return {
    config,
    proxyConfig,
    loading,
    generating,
    generateConfig,
    reloadConfig,
    fetchProxyConfig,
  }
}