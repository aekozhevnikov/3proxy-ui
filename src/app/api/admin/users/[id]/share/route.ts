import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/core/auth";
import { logger } from "@/src/core/logger";
import { prisma } from "@/src/prisma/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/users/[id]/share
 * Returns the plain proxy password of a single user, for the share modal.
 * Deliberately separate from the list endpoint so that rendering the users
 * table does not hand every password to the browser at once.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const { id } = await params;
        const userId = Number(id);

        if (!Number.isInteger(userId)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const user = await prisma.proxyUser.findUnique({
            where: { id: userId },
            select: { username: true, password: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        logger.info(`[share] Plain password read for proxy user "${user.username}"`);

        return NextResponse.json({
            success: true,
            username: user.username,
            password: user.password
        });
    } catch (error) {
        logger.error("[share] credential read failed:", error);

        return NextResponse.json({ error: "Failed to fetch user credentials" }, { status: 500 });
    }
}
