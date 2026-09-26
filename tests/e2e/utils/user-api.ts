/**
 * API client for admin operations
 */

import { apiCall, createAdminSession } from "./helpers.js";

export interface UserData {
    username: string;
    password: string;
    dataLimit?: number | null;
    ipLimit?: number;
    telegramUserId?: string | null;
    isActive?: boolean;
    expiresAt?: string | null;
}

export interface ProxyUser {
    id: number;
    username: string;
    isActive: boolean;
    dataLimit: number | null;
    dataUsed: number;
    ipLimit: number;
    expiresAt: string | null;
    deactivatedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

function isProxyUser(obj: unknown): obj is ProxyUser {
    if (typeof obj !== "object" || obj === null) return false;
    const user = obj as Record<string, unknown>;
    return (
        typeof user.id === "number" &&
        typeof user.username === "string" &&
        typeof user.isActive === "boolean" &&
        (typeof user.dataLimit === "number" || user.dataLimit === null) &&
        typeof user.dataUsed === "number" &&
        typeof user.ipLimit === "number" &&
        (typeof user.expiresAt === "string" || user.expiresAt === null) &&
        (typeof user.deactivatedAt === "string" || user.deactivatedAt === null) &&
        typeof user.createdAt === "string" &&
        typeof user.updatedAt === "string"
    );
}

function asProxyUser(obj: unknown): ProxyUser {
    if (isProxyUser(obj)) return obj;
    throw new Error(`Invalid ProxyUser data: ${JSON.stringify(obj)}`);
}

function asProxyUserList(obj: unknown): ProxyUser[] {
    if (Array.isArray(obj) && obj.every(isProxyUser)) return obj;
    throw new Error(`Invalid ProxyUser list data: ${JSON.stringify(obj)}`);
}

export class UserApiClient {
    private token: string | null = null;

    async ensureAuthenticated(): Promise<void> {
        if (!this.token) {
            this.token = await createAdminSession();
        }
    }

    async createUser(data: UserData): Promise<ProxyUser> {
        await this.ensureAuthenticated();
        const result = await apiCall(
            this.token!,
            "/api/admin/users",
            "POST",
            data as unknown as Record<string, unknown>
        );

        if (!result.success) {
            throw new Error(`Failed to create user: ${result.error ?? JSON.stringify(result)}`);
        }

        return asProxyUser(result.user);
    }

    async getUser(id: number): Promise<ProxyUser> {
        await this.ensureAuthenticated();
        const result = await apiCall(this.token!, `/api/admin/users/${id}`);

        if (result.error) {
            throw new Error(`Failed to get user ${id}: ${result.error}`);
        }

        return asProxyUser(result.user);
    }

    async updateUser(id: number, data: Partial<UserData>): Promise<ProxyUser> {
        await this.ensureAuthenticated();
        // Роут обновления объявлен на PUT, PATCH вернёт 405.
        const result = await apiCall(
            this.token!,
            `/api/admin/users/${id}`,
            "PUT",
            data as unknown as Record<string, unknown>
        );

        if (!result.success) {
            throw new Error(`Failed to update user: ${result.error ?? JSON.stringify(result)}`);
        }

        return asProxyUser(result.user);
    }

    async deleteUser(id: number): Promise<void> {
        await this.ensureAuthenticated();
        const result = await apiCall(this.token!, `/api/admin/users/${id}`, "DELETE");

        if (!result.success) {
            throw new Error(`Failed to delete user: ${result.error ?? JSON.stringify(result)}`);
        }
    }

    async listUsers(): Promise<ProxyUser[]> {
        await this.ensureAuthenticated();
        const result = await apiCall(this.token!, "/api/admin/users");

        if (!Array.isArray(result.users)) {
            throw new Error(`Failed to fetch users list: ${JSON.stringify(result)}`);
        }

        return asProxyUserList(result.users);
    }

    async triggerMaintenance(): Promise<{ updatedCount: number; deactivatedCount: number }> {
        await this.ensureAuthenticated();
        const result = await apiCall(this.token!, "/api/users/maintenance", "POST", {});

        if (!result.success) {
            throw new Error(`Maintenance failed: ${result.error ?? JSON.stringify(result)}`);
        }

        return {
            updatedCount: Number(result.updatedCount ?? 0),
            deactivatedCount: Number(result.deactivatedCount ?? 0)
        };
    }
}
