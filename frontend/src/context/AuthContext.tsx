"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"

import { api, type SessionResponse, type User, type LoginResponse } from "@/api/client"

interface AuthContextType {
  session: SessionResponse
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changeCredentials: (username: string, currentPassword: string, newPassword?: string) => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse>({ isAuthorized: false })
  const [loading, setLoading] = useState(true)

  const refreshSession = async () => {
    try {
      const response = await api.session()
      setSession(response.data)
    } catch {
      setSession({ isAuthorized: false })
    }
  }

  useEffect(() => {
    refreshSession()
  }, [])

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password)
    setSession({
      isAuthorized: true,
      userId: response.data.user.id,
      username: response.data.user.username,
    })
  }

  const logout = async () => {
    await api.logout()
    setSession({ isAuthorized: false })
    window.location.href = "/"
  }

  const changeCredentials = async (username: string, currentPassword: string, newPassword?: string) => {
    await api.changeCredentials(username, currentPassword, newPassword)
    await refreshSession()
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, changeCredentials, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}