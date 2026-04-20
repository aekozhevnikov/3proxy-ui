import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { app } from "@/src/core/config";

export async function proxy(request: NextRequest) {
    // Skip public paths
    if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/auth/")) {
        return NextResponse.next();
    }

    // Protect all /admin/* paths
    if (request.nextUrl.pathname.startsWith("/admin")) {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
            const url = request.nextUrl.clone();

            url.pathname = "/login";

            return NextResponse.redirect(url);
        }

        try {
            jwt.verify(sessionCookie, app.jwtSecret, {
                audience: "3proxy-ui",
                issuer: "3proxy-ui",
                algorithms: ["HS256"]
            });
        } catch {
            // Invalid token
            const url = request.nextUrl.clone();

            url.pathname = "/login";

            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"]
};
