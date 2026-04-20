import type { ProxyUser } from "@prisma/client";

import { NextResponse } from "next/server";

import { prisma } from "@/src/prisma/db";

export async function GET() {
    try {
        // Get all active users
        const users = await prisma.proxyUser.findMany({
            where: { isActive: true },
            select: {
                username: true,
                password: true,
                dataLimit: true,
                expiresAt: true,
                ipLimit: true
            },
            orderBy: { username: "asc" }
        });

        // Build array of users for 3proxy
        const proxyUsers = users.map((user: ProxyUser) => {
            const flags: string[] = [];

            // Data limit in bytes (MB -> bytes)
            if (user.dataLimit) {
                const bytes = Number(user.dataLimit) * 1024 * 1024;

                flags.push(`d${bytes}`);
            }

            // Expiration timestamp
            if (user.expiresAt) {
                const expireTime = Math.floor(new Date(user.expiresAt).getTime() / 1000);

                flags.push(`e${expireTime}`);
            }

            // IP limit (requires IPCOUNT)
            if (user.ipLimit && user.ipLimit > 1) {
                flags.push(`i${user.ipLimit}`);
            }

            return {
                username: user.username,
                password: user.password,
                flags: flags.length > 0 ? flags.join("") : undefined
            };
        });

        // Build allow list (comma-separated usernames)
        const allowList = users.map((u: ProxyUser) => u.username).join(",");

        // Return JSON that will be used in mustache template
        return NextResponse.json({
            users: proxyUsers,
            allow_list: allowList,
            userCount: proxyUsers.length,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Config status error:", error);

        return NextResponse.json({ error: "Failed to generate config" }, { status: 500 });
    }
}
