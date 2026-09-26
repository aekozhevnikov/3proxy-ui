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
    const { user, authenticated } = await checkAdmin();

    if (!authenticated) {
        return {
            user: MISSING_USER,
            denial: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        };
    }

    if (!user) {
        return {
            user: MISSING_USER,
            denial: NextResponse.json({ error: "Forbidden" }, { status: 403 })
        };
    }

    return { user, denial: null };
}

/**
 * The same check for server actions and server components, where a
 * NextResponse cannot be returned. Returns null when the caller is not an
 * authenticated admin.
 */
export async function resolveAdmin(): Promise<AdminSession | null> {
    return (await checkAdmin()).user;
}

/**
 * For server actions, which cannot return a response. Throws instead, so a
 * caller that forgets the check fails closed rather than proceeding.
 */
export async function assertAdmin(): Promise<AdminSession> {
    const user = await resolveAdmin();

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user;
}

/**
 * Distinguishes "no session" from "not an admin" so the route guard can answer
 * 401 versus 403. The two collapse into one boolean elsewhere because the
 * project compiles with strict: false.
 */
async function checkAdmin(): Promise<{ user: AdminSession | null; authenticated: boolean }> {
    const session = await currentSession();

    if (!session.isAuthorized || session.userId === undefined) {
        return { user: null, authenticated: false };
    }

    const record = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, isAdmin: true }
    });

    return {
        user: record && record.isAdmin ? { id: record.id, username: record.username } : null,
        authenticated: true
    };
}
