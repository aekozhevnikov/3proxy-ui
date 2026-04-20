import { NextResponse } from "next/server";

import { currentSession } from "@/src/core/session";

export async function GET() {
    try {
        const session = await currentSession();

        return NextResponse.json(session);
    } catch {
        return NextResponse.json({ isAuthorized: false });
    }
}
