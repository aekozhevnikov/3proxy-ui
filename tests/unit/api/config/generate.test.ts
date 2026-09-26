/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET } from "@/src/app/api/config/generate/route";

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

describe("config/generate API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("describes each user with their limits", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            {
                username: "user1",
                password: "hashedpass",
                dataLimit: 1024n,
                expiresAt: new Date("2025-01-01T00:00:00.000Z"),
                ipLimit: 1,
            } as any,
        ]);

        const result = await GET();
        const data = (await result.json()) as { success: boolean; config: string };

        expect(data.success).toBe(true);
        expect(data.config).toContain("user1");
        expect(data.config).toContain("1024 MB");
        expect(data.config).toContain("expires 2025-01-01T00:00:00.000Z");
    });

    it("never emits the password", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "plaintextsecret", dataLimit: null, expiresAt: null, ipLimit: 1 } as any,
        ]);

        const result = await GET();
        const body = await result.text();

        expect(body).not.toContain("plaintextsecret");
    });

    it("never emits a 3proxy directive line", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "pass", dataLimit: null, expiresAt: null, ipLimit: 1 } as any,
        ]);

        const result = await GET();
        const data = (await result.json()) as { config: string };

        // 3proxy defines a user entry as exactly login:type:password, and this
        // endpoint has no reason to produce config text at all.
        expect(data.config).not.toContain(":CL:");
        expect(data.config).not.toContain("allow *");
    });

    it("marks an unlimited user as such", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "pass", dataLimit: null, expiresAt: null, ipLimit: null } as any,
        ]);

        const result = await GET();
        const data = (await result.json()) as { config: string };

        expect(data.config).toContain("user1 (unlimited)");
    });

    it("reports an IP limit above one", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([
            { username: "user1", password: "pass", dataLimit: null, expiresAt: null, ipLimit: 5 } as any,
        ]);

        const result = await GET();
        const data = (await result.json()) as { config: string };

        expect(data.config).toContain("max 5 IPs");
    });

    it("returns an empty config when no active users", async () => {
        mocked(prisma.proxyUser.findMany).mockResolvedValue([]);

        const result = await GET();
        const data = (await result.json()) as { success: boolean; config: string };

        expect(data.success).toBe(true);
        expect(data.config).toBe("");
    });

    it("returns 500 on database error", async () => {
        mocked(prisma.proxyUser.findMany).mockRejectedValue(new Error("DB error"));

        const result = await GET();
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Failed to generate config");
    });
});
