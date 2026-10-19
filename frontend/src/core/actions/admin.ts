import bcrypt from "bcrypt";

import { prisma } from "@/src/prisma/db";
import { generatePassword } from "@src/core/password-hash";

interface AdminUser {
    username: string;
    password: string;
    name: string;
    isAdmin: boolean;
}

/**
 * Ensures that an admin user exists in the database.
 * If admin doesn't exist, creates one with provided credentials or defaults.
 * Returns the admin user (either existing or newly created).
 */
export async function ensureAdminUser(
    overrides?: Partial<AdminUser>
): Promise<{ username: string; password: string } | null> {
    const adminConfig: AdminUser = {
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin",
        name: process.env.ADMIN_NAME || "Administrator",
        isAdmin: true,
        ...overrides
    };

    // bcrypt hash for User table (panel login)
    const bcryptHashedPassword = await bcrypt.hash(adminConfig.password, 10);

    try {
        // Check if admin already exists in User table
        const existing = await prisma.user.findFirst({
            where: { isAdmin: true },
            select: { username: true }
        });

        if (!existing) {
            // Create admin user in User table
            await prisma.user.create({
                data: {
                    username: adminConfig.username,
                    password: bcryptHashedPassword,
                    name: adminConfig.name,
                    isAdmin: true
                }
            });
        }

        // Ensure proxy user exists for admin in ProxyUser table (Option 1: all proxy users in DB)
        // Store the plain password — hashProxyPassword() will apply CRYPT-MD5 when writing .proxyauth
        const existingProxyUser = await prisma.proxyUser.findFirst({
            where: { username: adminConfig.username }
        });

        const generatedPassword = generatePassword();

        if (!existingProxyUser) {
            await prisma.proxyUser.create({
                data: {
                    username: adminConfig.username,
                    password: generatedPassword,
                    isActive: true,
                    dataLimit: null, // unlimited
                    dataUsed: 0,
                    ipLimit: 1,
                    telegramUserId: null,
                    expiresAt: null,
                    deactivatedAt: null
                }
            });
        }

        return existing ? null : { username: adminConfig.username, password: generatedPassword };
    } catch (error) {
        console.error("[ensureAdmin] Failed to ensure admin user:", error);
        throw error;
    }
}

/**
 * Ensures that there's at least one admin user.
 * This function is idempotent - safe to call multiple times.
 */
export async function ensureAdminExists(): Promise<void> {
    try {
        await ensureAdminUser();
    } catch (error) {
        console.error("[ensureAdmin] Error ensuring admin exists:", error);
    }
}
