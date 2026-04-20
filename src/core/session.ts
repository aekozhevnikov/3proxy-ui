import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { app } from "@/src/core/config";
import { SessionPayload } from "@/src/core/definitions";

export async function currentSession(): Promise<{ isAuthorized: boolean; userId?: number; username?: string }> {
    try {
        let sessionCookie: string | null = null;

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
        }) as SessionPayload;

        return { isAuthorized: true, userId: payload.userId, username: payload.username };
    } catch {
        return { isAuthorized: false };
    }
}
