import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/src/core/auth";
import { createProxyUser } from "@/src/core/actions/proxy-user";
import { prisma } from "@/src/prisma/db";
import { logger } from "@/src/core/logger";
import { isValidationError } from "@/src/core/errors";

// Disable caching for all responses in this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** The caller supplied the password, but echoing it back widens where it lives. */
function withoutPassword<T extends { password?: string }>(user: T): Omit<T, "password"> {
    const { password: _password, ...rest } = user;

    return rest;
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const body = await request.json();

        const user = await createProxyUser({
            username: body.username,
            password: body.password,
            isActive: body.isActive,
            dataLimit: body.dataLimit,
            ipLimit: body.ipLimit,
            telegramUserId: body.telegramUserId,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
        });

        return NextResponse.json({ success: true, user: withoutPassword(user) });
    } catch (error) {
        if (isValidationError(error)) {
            return NextResponse.json({ error: (error as Error).message }, { status: 400 });
        }

        logger.error("[api/users] create failed:", error);

        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const searchParams = request.nextUrl.searchParams;
        const includeStats = searchParams.get("stats") === "true";

        if (includeStats) {
            // Return user statistics summary
            const total = await prisma.proxyUser.count();
            const active = await prisma.proxyUser.count({ where: { isActive: true } });
            const inactive = await prisma.proxyUser.count({ where: { isActive: false } });
            const withDataLimit = await prisma.proxyUser.count({ where: { dataLimit: { not: null } } });

            return NextResponse.json({
                success: true,
                stats: {
                    total,
                    active,
                    inactive,
                    withDataLimit
                }
            });
        }

        // The list is rendered for every user of the panel, so it must not carry
        // the credentials. The share modal fetches them per user on demand.
        const users = await prisma.proxyUser.findMany({
            select: {
                id: true,
                username: true,
                isActive: true,
                dataLimit: true,
                dataUsed: true,
                ipLimit: true,
                telegramUserId: true,
                deactivatedAt: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { username: "asc" }
        });

        return NextResponse.json({
            success: true,
            users: users.map((user) => ({
                ...user,
                dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
                dataUsed: Number(user.dataUsed)
            }))
        });
    } catch (error) {
        logger.error("[api/users] list failed:", error);

        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
