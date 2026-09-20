/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET, POST } from "@/src/app/api/admin/users/route";
import { NextRequest } from "next/server";

jest.mock("@/src/prisma/db", () => {
    const mockProxyUser = {
        findMany: jest.fn(),
        count: jest.fn(),
    };
    return {
        __esModule: true,
        default: { proxyUser: mockProxyUser },
        prisma: { proxyUser: mockProxyUser },
    };
});

jest.mock("@/src/core/session", () => ({
    currentSession: jest.fn(),
}));

jest.mock("@/src/core/actions/proxy-user", () => ({
    createProxyUser: jest.fn(),
}));

import { prisma } from "@/src/prisma/db";
import { currentSession } from "@/src/core/session";
import { createProxyUser } from "@/src/core/actions/proxy-user";

const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
};

describe("admin/users API", () => {
    beforeEach(() => {
        mocked(currentSession).mockResolvedValue({ isAuthorized: true });
    });

    describe("POST", () => {
        it("returns 401 when unauthorized", async () => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: false });

            const result = await POST(createRequest({ username: "test", password: "pass" }));
            const data = await result.json();

            expect(result.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("creates user with provided data", async () => {
            mocked(createProxyUser).mockResolvedValue({
                id: 1,
                username: "newuser",
                password: "hashedpass",
                isActive: true,
                dataLimit: null,
                ipLimit: null,
                telegramUserId: null,
                expiresAt: null,
                deactivatedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                dataUsed: 0,
            });

            const result = await POST(createRequest({
                username: "newuser",
                password: "pass123",
            }));
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.user.username).toBe("newuser");
        });

        it("returns 500 on error", async () => {
            mocked(createProxyUser).mockRejectedValue(new Error("Creation failed"));

            const result = await POST(createRequest({
                username: "newuser",
                password: "pass123",
            }));
            const data = await result.json();

            expect(result.status).toBe(500);
            expect(data.error).toBe("Creation failed");
        });
    });

    describe("GET", () => {
        it("returns 401 when unauthorized", async () => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: false });

            const result = await GET(new NextRequest("http://localhost/api/admin/users"));
            const data = await result.json();

            expect(result.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("returns user stats when stats=true", async () => {
            mocked(prisma.proxyUser.count).mockResolvedValueOnce(10);
            mocked(prisma.proxyUser.count).mockResolvedValueOnce(8);
            mocked(prisma.proxyUser.count).mockResolvedValueOnce(2);
            mocked(prisma.proxyUser.count).mockResolvedValueOnce(5);

            const request = new NextRequest("http://localhost/api/admin/users?stats=true");
            const result = await GET(request);
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.stats).toEqual({
                total: 10,
                active: 8,
                inactive: 2,
                withDataLimit: 5,
            });
        });

        it("returns all users when stats not requested", async () => {
            mocked(prisma.proxyUser.findMany).mockResolvedValue([
                {
                    id: 1,
                    username: "user1",
                    password: "pass",
                    isActive: true,
                    dataLimit: 1024n,
                    ipLimit: 1,
                    telegramUserId: null,
                    expiresAt: null,
                    deactivatedAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    dataUsed: 0n,
                },
            ]);

            const request = new NextRequest("http://localhost/api/admin/users");
            const result = await GET(request);
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.users.length).toBe(1);
            expect(data.users[0].username).toBe("user1");
        });

        it("returns 500 on error", async () => {
            mocked(prisma.proxyUser.findMany).mockRejectedValue(new Error("DB error"));

            const request = new NextRequest("http://localhost/api/admin/users");
            const result = await GET(request);
            const data = await result.json();

            expect(result.status).toBe(500);
            expect(data.error).toBe("DB error");
        });
    });
});
