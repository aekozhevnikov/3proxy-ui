import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { app } from "@/src/core/config";
import { prisma } from "@/src/prisma/db";
import { SessionPayload } from "@/src/core/definitions";

function isSessionPayload(payload: unknown): payload is SessionPayload {
    if (typeof payload !== "object" || payload === null) return false;
    const record = <Record<string, unknown>>payload;

    return (
        "userId" in record &&
        typeof record.userId === "number" &&
        "username" in record &&
        typeof record.username === "string"
    );
}

export async function currentSession(): Promise<{ isAuthorized: boolean; userId?: number; username?: string }> {
    try {
        let sessionCookie: string | null;

        if (typeof window !== "undefined") {
            // Client-side
            const match = document.cookie.match(/session=([^;]+)/);

            sessionCookie = match ? match[1] : null;
        } else {
            // Server-side
            const cookieStore = await cookies();

            sessionCookie = cookieStore.get("session")?.value ?? null;
        }

        if (!sessionCookie) {
            return { isAuthorized: false };
        }

        const payload = jwt.verify(sessionCookie, app.jwtSecret, {
            audience: "3proxy-ui",
            issuer: "3proxy-ui",
            algorithms: ["HS256"]
        });

        if (!isSessionPayload(payload)) {
            return { isAuthorized: false };
        }

        // A valid signature is not enough. The account may have been deleted or
        // de-admined since the token was issued, and the password may have
        // changed, which bumps sessionVersion. Checking here means a stolen or
        // abandoned token stops working immediately rather than at the end of
        // its hour. This runs on the server only: a browser has no database.
        if (typeof window === "undefined") {
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { sessionVersion: true }
            });

            if (!user || user.sessionVersion !== (payload.sessionVersion ?? 0)) {
                return { isAuthorized: false };
            }
        }

        return { isAuthorized: true, userId: payload.userId, username: payload.username };
    } catch {
        return { isAuthorized: false };
    }
}
