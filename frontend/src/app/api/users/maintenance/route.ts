import { NextResponse } from "next/server";

import { requireAdmin } from "@/src/core/auth";
import { logger } from "@/src/core/logger";
import { runMaintenanceJob } from "@/src/lib/maintenance-job";

export async function POST(): Promise<Response> {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const result = await runMaintenanceJob();

        return NextResponse.json({ success: true, message: "Maintenance completed", ...result });
    } catch (error) {
        logger.error("[maintenance] Failed:", error);

        return NextResponse.json({ success: false, error: "Maintenance failed" }, { status: 500 });
    }
}
