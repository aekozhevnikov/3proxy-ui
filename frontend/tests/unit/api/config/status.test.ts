/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/config/status/route";

jest.mock("@/src/core/auth", () => ({
    requireAdmin: jest.fn(async () => ({ user: { id: 1, username: "admin" }, denial: null }))
}));

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
        const data = (await result.json()) as { users: Array<{ username: string; dataLimit: number | null; ipLimit: number | null }> };

        expect(data.users.length).toBe(2);
        expect(data.users[0].username).toBe("user1");
        expect(data.users[0].dataLimit).toBe(1024);
        expect(data.users[1].dataLimit).toBeNull();
    });

    it("never returns the password column", async () => {
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
        const body = await result.text();

        expect(body).not.toContain("hashedpass1");
        expect(body).not.toContain("password");
    });

    it("returns null limits when the user is unlimited", async () => {
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
        const data = (await result.json()) as { users: Array<{ dataLimit: number | null }> };

        expect(data.users[0].dataLimit).toBeNull();
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
