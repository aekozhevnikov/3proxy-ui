import { NextResponse } from "next/server";

import { find3proxyContainer, restart3proxyContainer } from "@/src/core/docker";
import { requireAdmin } from "@/src/core/auth";

export async function POST(): Promise<Response> {
    try {
        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const containerInfo = await find3proxyContainer();

        if (containerInfo) {
            const output = await restart3proxyContainer(containerInfo.id);

            return NextResponse.json({
                success: true,
                message: "Configuration reloaded and container restarted",
                output
            });
        }

        return NextResponse.json({
            success: true,
            message: "Configuration updated (no container to restart)",
            output: "File system updated"
        });
    } catch (e) {
        console.error("Config reload error:", e);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to reload configuration",
                error: e instanceof Error ? e.message : "unknown error"
            },
            { status: 500 }
        );
    }
}
