import { NextResponse } from "next/server";

import { currentSession } from "@/src/core/session";
import { prisma } from "@/src/prisma/db";

export interface AdminSession {
    id: number;
    username: string;
}

export interface AdminCheck {
    /** Set when the caller is an authenticated admin. */
    user: AdminSession;
    /** Set when the caller must be rejected. Return this straight from the handler. */
    denial: NextResponse | null;
}

const MISSING_USER = undefined as unknown as AdminSession;

/**
 * Authorisation for routes and server actions that change state or return
 * data. The session cookie alone is not enough: the role is read from the
 * database on every call, so a de-admined or deleted account stops working
 * immediately instead of at the end of the token lifetime.
 *
 * Call it as the first statement of the handler, before touching the request
 * body, so an unauthenticated caller cannot reach any side effect:
 *
 *     const auth = await requireAdmin();
 *     if (auth.denial) return auth.denial;
 *
 * The shape carries both fields rather than a discriminated union because the
 * project compiles with strict: false, where narrowing a union on a boolean
 * literal does not work.
 */
export async function requireAdmin(): Promise<AdminCheck> {
    const session = await currentSession();

    if (!session.isAuthorized || session.userId === undefined) {
        return {
            user: MISSING_USER,
            denial: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, isAdmin: true }
    });

    if (!user || !user.isAdmin) {
        return {
            user: MISSING_USER,
            denial: NextResponse.json({ error: "Forbidden" }, { status: 403 })
        };
    }

    return { user: { id: user.id, username: user.username }, denial: null };
}
