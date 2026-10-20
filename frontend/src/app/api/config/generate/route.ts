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
            orderBy: { username: "asc" }
        });

        // The previous version rendered `users <name>:CL:<plaintext>:<flags>`.
        // Both halves were wrong: the password is a secret this endpoint has no
        // reason to emit, and 3proxy defines no per-user flags, so a user entry
        // is exactly login:type:password. The generated file itself is written
        // by proxyauthEntry, not from here.
        const config = users
            .map((user) => {
                const limits: string[] = [];

                if (user.dataLimit) limits.push(`${Number(user.dataLimit)} MB`);
                if (user.expiresAt) limits.push(`expires ${user.expiresAt.toISOString()}`);
                if (user.ipLimit && user.ipLimit > 1) limits.push(`max ${user.ipLimit} IPs`);

                return limits.length > 0 ? `${user.username} (${limits.join(", ")})` : `${user.username} (unlimited)`;
            })
            .join("\n");

        return NextResponse.json({
            success: true,
            config,
            userCount: users.length,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Config generation error:", error);

        return NextResponse.json({ error: "Failed to generate config" }, { status: 500 });
    }
}
