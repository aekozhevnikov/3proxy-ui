import { JWTPayload } from "jose";

// Session types
export interface SessionPayload extends JWTPayload {
    userId: number;
    username: string;
}

export interface UserSession {
    isAuthorized: boolean;
    userId: number | undefined;
}

// 3proxy ProxyUser types
export interface ProxyUser {
    id: number;
    username: string;
    password?: string; // Not part of the list response; fetched on demand for sharing
    isActive: boolean;
    dataLimit: number | null; // in MB
    dataUsed: number; // in MB
    ipLimit: number | null; // Max IP addresses per user (requires IPCOUNT feature)
    telegramUserId: string | null; // Telegram user ID for notifications
    deactivatedAt: Date | null; // When user was deactivated due to reaching data limit
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface NewProxyUserRequest {
    username: string;
    password: string;
    isActive?: boolean;
    dataLimit?: number | null; // in MB
    ipLimit?: number; // Max IPs, default 1
    telegramUserId?: string | null;
    deactivatedAt?: Date | null;
    expiresAt?: Date | null;
}

export interface EditProxyUserRequest {
    id: number;
    username: string;
    password?: string; // Optional for edit
    isActive?: boolean;
    dataLimit?: number | null; // in MB
    ipLimit?: number; // Max IPs
    telegramUserId?: string | null;
    deactivatedAt?: Date | null;
    expiresAt?: Date | null;
}

// User type for authentication
export interface User {
    id: number;
    username: string;
    name?: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date | null;
}

// Log type for filtering
export type LogType = "all" | "PROXY" | "SOCKS" | "ADMIN";
