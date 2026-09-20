/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/config/status/route";

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

describe("config/status API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns users with flags when dataLimit, expiresAt, or ipLimit are set", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            {
                username: "user1",
                password: "hashedpass1",
                dataLimit: 1024n,
                expiresAt: new Date("2025-01-01"),
                ipLimit: 1,
            } as any,
            {
                username: "user2",
                password: "hashedpass2",
                dataLimit: null,
                expiresAt: null,
                ipLimit: 1,
            } as any,
        ]);

        const result = await GET();
        const data = await result.json() as { users: Array<{ username: string; password: string; flags?: string }> };

        expect(data.users.length).toBe(2);
        expect(data.users[0].username).toBe("user1");
        expect(data.users[0].flags).toContain("d");
        expect(data.users[0].flags).toContain("e");
        expect(data.users[1].flags).toBeUndefined();
    });

    it("returns users with no flags when no dataLimit, expiresAt, or ipLimit", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            {
                username: "user1",
                password: "hashedpass1",
                dataLimit: null,
                expiresAt: null,
                ipLimit: 1,
            } as any,
        ]);

        const result = await GET();
        const data = await result.json() as { users: Array<{ flags?: string }> };

        expect(data.users[0].flags).toBeUndefined();
    });

    it("returns empty users array when no active users", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([]);

        const result = await GET();
        const data = await result.json() as { users: unknown[] };

        expect(data.users).toEqual([]);
    });

    it("returns 500 on database error", async () => {
        mocked(prisma.proxyUser.findMany).mockRejectedValue(new Error("DB error"));

        const result = await GET();
        const data = await result.json() as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Failed to generate config");
    });
});
