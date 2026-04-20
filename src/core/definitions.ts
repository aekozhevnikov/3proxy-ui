import { JWTPayload } from "jose";
import { SVGProps } from "react";

// Session types
export interface SessionPayload extends JWTPayload {
    userId: number;
    username: string;
}

export interface UserSession {
    isAuthorized: boolean;
    userId: number | undefined;
}

// Icon props
export type IconSvgProps = SVGProps<SVGSVGElement> & {
    size?: number;
};

// 3proxy ProxyUser types
export interface ProxyUser {
    id: number;
    username: string;
    password: string;
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

// Server type for 3proxy servers
export interface Server {
    id: number;
    name: string;
    hostnameOrIp: string;
    portForNewAccessKeys: number;
    apiUrl: string | null;
    apiId: string | null;
    apiCertSha256: string | null;
    apiCreatedAt: Date | null;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date | null;
}

// Config version for tracking config changes
export interface ConfigVersion {
    id: number;
    version: number;
    config?: string | null;
    updatedAt: Date;
}
