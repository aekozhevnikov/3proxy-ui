export interface ProxyUser {
  id: number
  username: string
  isActive: boolean
  dataLimit: number | null
  dataUsed: number
  ipLimit: number | null
  telegramUserId: string | null
  deactivatedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  isAuthorized: boolean
  userId: number | undefined
  username?: string
}
