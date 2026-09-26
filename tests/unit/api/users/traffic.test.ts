/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/users/traffic/route";
import { readTrafficLogs, UserTrafficStats } from "@/src/lib/traffic-parser";

jest.mock("@/src/core/auth", () => ({
    requireAdmin: jest.fn(async () => ({ user: { id: 1, username: "admin" }, denial: null }))
}));

jest.mock("@/src/lib/traffic-parser", () => ({
    readTrafficLogs: jest.fn(),
}));

describe("users/traffic API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns traffic data for all users", async () => {
        const mockMap = new Map<string, UserTrafficStats>([
            ["user1", { totalRequests: 10, totalSent: 1024, totalReceived: 2048 }],
            ["user2", { totalRequests: 5, totalSent: 512, totalReceived: 1024 }],
        ]);
        mocked(readTrafficLogs).mockResolvedValue(mockMap);

        const result = await GET();
        const data = await result.json() as Record<string, { requests: number; sent: number; received: number }>;

        expect(data).toHaveProperty("user1");
        expect(data).toHaveProperty("user2");
        expect(data.user1).toEqual({
            requests: 10,
            sent: 1024,
            received: 2048,
        });
    });

    it("returns empty object when no traffic data", async () => {
        mocked(readTrafficLogs).mockResolvedValue(new Map());

        const result = await GET();
        const data = await result.json() as Record<string, unknown>;

        expect(data).toEqual({});
    });

    it("sets CORS header", async () => {
        mocked(readTrafficLogs).mockResolvedValue(new Map());

        const result = await GET();

        expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("returns 500 on error", async () => {
        mocked(readTrafficLogs).mockRejectedValue(new Error("Parse error"));

        const result = await GET();
        const data = await result.json() as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Failed to read traffic logs");
    });
});
