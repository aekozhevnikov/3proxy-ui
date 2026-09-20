/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/config/generate/route";

jest.mock("@/src/prisma/db", () => {
    const mockProxyUser = {
        findMany: jest.fn(),
    };
    return {
        __esModule: true,
        default: { proxyUser: mockProxyUser },
        prisma: { proxyUser: mockProxyUser },
    };
});

import { prisma } from "@/src/prisma/db";

describe("config/generate API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("generates config with user data", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            {
                username: "user1",
                password: "hashedpass",
                dataLimit: 1024n,
                expiresAt: new Date("2025-01-01"),
                ipLimit: 1,
            } as any,
        ]);

        const result = await GET();
        const data = await result.json() as { success: boolean; config: string };

        expect(data.success).toBe(true);
        expect(data.config).toContain("user1:CL:hashedpass");
        expect(data.config).toContain("d1073741824");
        expect(data.config).toContain("allow *");
    });

    it("includes data limit flag when set", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "pass", dataLimit: 2048n, expiresAt: null, ipLimit: 1 } as any,
        ]);

        const result = await GET();
        const data = await result.json() as { config: string };

        expect(data.config).toContain(":CL:pass:d2147483648");
    });

    it("includes IP limit flag when greater than 1", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "pass", dataLimit: null, expiresAt: null, ipLimit: 5 } as any,
        ]);

        const result = await GET();
        const data = await result.json() as { config: string };

        expect(data.config).toContain("i5");
    });

    it("returns empty config when no active users", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([]);

        const result = await GET();
        const data = await result.json() as { success: boolean; config: string };

        expect(data.success).toBe(true);
        expect(data.config).toContain("allow *");
    });

    it("returns 500 on database error", async () => {
        mocked(prisma.proxyUser.findMany).mockRejectedValue(new Error("DB error"));

        const result = await GET();
        const data = await result.json() as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Failed to generate config");
    });
});
