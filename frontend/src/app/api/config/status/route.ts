import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/core/auth";
import { prisma } from "@/src/prisma/db";

export async function GET() {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const users = await prisma.proxyUser.findMany({
            where: { isActive: true },
            select: {
                username: true,
                dataLimit: true,
                expiresAt: true,
                ipLimit: true
            },
            orderBy: { username: "asc" }
        });

        // The password is deliberately not part of this response. It is not
        // needed to describe the configuration, and the share endpoint already
        // serves the one case that genuinely requires a plaintext.
        const proxyUsers = users.map((user) => ({
            username: user.username,
            dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
            expiresAt: user.expiresAt,
            ipLimit: user.ipLimit
        }));

        const allowList = users.map((u) => u.username).join(",");

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
