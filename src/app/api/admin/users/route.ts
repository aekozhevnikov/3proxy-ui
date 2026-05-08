import { NextRequest, NextResponse } from "next/server";

import { currentSession } from "@/src/core/session";
import { createProxyUser } from "@/src/core/actions/proxy-user";
import { prisma } from "@/src/prisma/db";

// Disable caching for all responses in this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
    try {
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        return NextResponse.json({ success: true, user });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create user" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        // Return all users (for /api/admin/users list)
        const users = await prisma.proxyUser.findMany({
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch users" },
            { status: 500 }
        );
    }
}
