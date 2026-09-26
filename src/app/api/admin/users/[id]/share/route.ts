import { NextResponse } from "next/server";

import { currentSession } from "@/src/core/session";
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
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch user credentials" },
            { status: 500 }
        );
    }
}
