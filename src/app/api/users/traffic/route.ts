import { NextResponse } from "next/server";

import { readTrafficLogs, UserTrafficStats } from "@/src/lib/traffic-parser";

/**
 * GET /api/users/traffic
 * Returns traffic statistics for ALL users at once
 * Format: { "username1": { requests: 123, sent: 456, received: 789 }, ... }
 */
export async function GET() {
    try {
        const trafficData = await readTrafficLogs();

        // Convert Map to plain object for JSON response
        const result: Record<string, { requests: number; sent: number; received: number }> = {};

        trafficData.forEach((stats: UserTrafficStats, username: string) => {
            result[username] = {
                requests: stats.totalRequests,
                sent: stats.totalSent,
                received: stats.totalReceived
            };
        });

        return NextResponse.json(result, {
            headers: {
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (error) {
        console.error("Failed to read traffic logs:", error);

        return NextResponse.json({ error: "Failed to read traffic logs" }, { status: 500 });
    }
}
