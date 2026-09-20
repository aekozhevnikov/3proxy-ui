/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/logs/route";
import { NextRequest } from "next/server";
import * as logParser from "@/src/core/log-parser";

jest.mock("@/src/core/log-parser", () => ({
    getLogs: jest.fn(),
    getAvailableLogDates: jest.fn(),
    getLogStats: jest.fn(),
}));

const createRequest = (searchParams?: string) => {
    const url = searchParams ? `http://localhost/api/logs?${searchParams}` : "http://localhost/api/logs";
    return new NextRequest(url);
};

describe("logs API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns logs with available dates and stats", async () => {
        mocked(logParser.getLogs).mockResolvedValue({
            entries: [{
                time_unix: 1710460800,
                proxy: { type: "HTTP", port: 3128 },
                error: { code: "0" },
                auth: { user: "testuser" },
                client: { ip: "127.0.0.1", port: 12345 },
                server: { ip: "127.0.0.1", port: 3128 },
                bytes: { sent: 100, received: 200 },
                request: { hostname: "localhost" },
                message: "Connection established",
                raw: "log1",
            }],
            total: 1,
            filesScanned: 1,
        });
        mocked(logParser.getAvailableLogDates).mockResolvedValue(["2024-03-15"]);
        mocked(logParser.getLogStats).mockResolvedValue({
            totalLogs: 100,
            dateRange: { earliest: "2024-03-01", latest: "2024-03-15" },
            files: 3,
            size: 10240,
        });

        const result = await GET(createRequest());
        const data = await result.json() as {
            success: boolean;
            logs: unknown[];
            total: number;
            filesScanned: number;
            availableDates: string[];
            stats: { totalLogs: number };
        };

        expect(data.success).toBe(true);
        expect(data.logs).toEqual([{ raw: "log1" }]);
        expect(data.total).toBe(1);
        expect(data.filesScanned).toBe(1);
        expect(data.availableDates).toEqual(["2024-03-15"]);
        expect(data.stats.totalLogs).toBe(100);
    });

    it("passes filter parameters from query string", async () => {
        mocked(logParser.getLogs).mockResolvedValue({
            entries: [],
            total: 0,
            filesScanned: 0,
        });
        mocked(logParser.getLogStats).mockResolvedValue({
            totalLogs: 0,
            dateRange: { earliest: null, latest: null },
            files: 0,
            size: 0,
        });

        await GET(createRequest("username=testuser&logType=PROXY&limit=10&offset=20"));

        expect(logParser.getLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                username: "testuser",
                logType: "PROXY",
                limit: 10,
                offset: 20,
            })
        );
    });

    it("sets CORS headers", async () => {
        mocked(logParser.getLogs).mockResolvedValue({
            entries: [],
            total: 0,
            filesScanned: 0,
        });
        mocked(logParser.getAvailableLogDates).mockResolvedValue([]);
        mocked(logParser.getLogStats).mockResolvedValue({
            totalLogs: 0,
            dateRange: { earliest: null, latest: null },
            files: 0,
            size: 0,
        });

        const result = await GET(createRequest());

        expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(result.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
        expect(result.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
    });

    it("returns 500 on error", async () => {
        mocked(logParser.getLogs).mockRejectedValue(new Error("Parse error"));

        const result = await GET(createRequest());
        const data = await result.json() as { success: boolean; message: string; error: string };

        expect(result.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.message).toBe("Failed to fetch logs");
        expect(data.error).toBe("Parse error");
    });

    it("includes applied filter in response", async () => {
        mocked(logParser.getLogs).mockResolvedValue({
            entries: [],
            total: 0,
            filesScanned: 0,
        });
        mocked(logParser.getAvailableLogDates).mockResolvedValue([]);
        mocked(logParser.getLogStats).mockResolvedValue({
            totalLogs: 0,
            dateRange: { earliest: null, latest: null },
            files: 0,
            size: 0,
        });

        const result = await GET(createRequest("username=testuser"));
        const data = await result.json() as { filter: { applied: Record<string, unknown> } };

        expect(data.filter.applied).toEqual(
            expect.objectContaining({
                username: "testuser",
            })
        );
    });
});
