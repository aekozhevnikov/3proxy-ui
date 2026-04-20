import { NextRequest, NextResponse } from "next/server";

import { getLogs, getAvailableLogDates, getLogStats } from "@/src/core/log-parser";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filter = {
            startDate: searchParams.get("startDate") || undefined,
            endDate: searchParams.get("endDate") || undefined,
            username: searchParams.get("username") || undefined,
            logType: (searchParams.get("logType") as "all" | "PROXY" | "SOCKS" | "ADMIN") || "all",
            limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 1000,
            offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0
        };

        const { entries, total, filesScanned } = await getLogs(filter);
        const availableDates = await getAvailableLogDates();
        const stats = await getLogStats();

        return NextResponse.json(
            {
                success: true,
                logs: entries,
                total,
                filesScanned,
                availableDates,
                stats,
                filter: {
                    applied: filter
                }
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            }
        );
    } catch (e) {
        console.error("Logs API error:", e);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch logs",
                error: e instanceof Error ? e.message : "unknown error"
            },
            { status: 500 }
        );
    }
}
