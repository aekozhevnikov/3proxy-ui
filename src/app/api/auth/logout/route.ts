import { NextResponse } from "next/server";

import { SESSION_COOKIE, sessionCookieOptions } from "@/src/core/session-cookie";

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Clear the session cookie
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });

    return response;
}
