import type { LogType } from "@/src/core/definitions";

import { NextRequest, NextResponse } from "next/server";

import { getLogs, getAvailableLogDates, getLogStats } from "@/src/core/log-parser";
import { requireAdmin } from "@/src/core/auth";

const VALID_LOG_TYPES: ReadonlySet<string> = new Set(["all", "PROXY", "SOCKS", "ADMIN"]);

function validateLogType(value: string | null): value is LogType {
    if (value === null) return false;

    return VALID_LOG_TYPES.has(value);
}

function parseLogType(value: string | null): LogType {
    if (validateLogType(value)) {
        return value;
    }

    return "all";
}

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

/** A caller cannot ask for the whole log: the parser would page it into memory. */
function parseLimit(raw: string | null): number {
    const parsed = raw === null ? DEFAULT_LIMIT : Number.parseInt(raw, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_LIMIT;
    }

    return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
    try {

        const auth = await requireAdmin();

        if (auth.denial) {
            return auth.denial;
        }

        const searchParams = request.nextUrl.searchParams;

        const filter = {
            startDate: searchParams.get("startDate") || undefined,
            endDate: searchParams.get("endDate") || undefined,
            username: searchParams.get("username") || undefined,
            logType: parseLogType(searchParams.get("logType")),
            limit: parseLimit(searchParams.get("limit")),
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
