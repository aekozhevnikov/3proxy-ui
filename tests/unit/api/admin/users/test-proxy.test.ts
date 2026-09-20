/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { NextRequest } from "next/server";

jest.mock("@/src/prisma/db", () => {
    const mockProxyUser = {
        findFirst: jest.fn(),
    };
    return {
        __esModule: true,
        default: { proxyUser: mockProxyUser },
        prisma: { proxyUser: mockProxyUser },
    };
});

const mockExecAsync = jest.fn();
jest.mock("child_process", () => ({
    exec: jest.fn(),
}));
jest.mock("util", () => ({
    promisify: jest.fn(() => mockExecAsync),
}));

import { prisma } from "@/src/prisma/db";

const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/admin/users/test-proxy", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
};

describe("admin/users/test-proxy API", () => {
    let POST: (req: NextRequest) => Promise<{ status: number; json: () => Promise<unknown> }>;

    beforeEach(async () => {
        const route = await import("@/src/app/api/admin/users/test-proxy/route");
        POST = route.POST;
        mockExecAsync.mockReset();
    });

    it("returns 400 when username is not provided", async () => {
        const result = await POST(createRequest({}));
        const data = await result.json() as { success: boolean; error: string };

        expect(result.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Username is required");
    });

    it("returns 404 when user is not found", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

        const result = await POST(createRequest({ username: "nonexistent" }));
        const data = await result.json() as { error: string };

        expect(result.status).toBe(404);
        expect(data.error).toContain("not found");
    });

    it("returns 404 when user has no password", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue({
            username: "testuser",
            password: null,
            isActive: true,
        } as any);

        const result = await POST(createRequest({ username: "testuser" }));
        const data = await result.json() as { error: string };

        expect(result.status).toBe(404);
        expect(data.error).toContain("no password");
    });

    it("returns 403 when user is deactivated", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue({
            username: "testuser",
            password: "hashedpass",
            isActive: false,
            deactivatedAt: new Date("2024-01-15"),
        } as any);

        const result = await POST(createRequest({ username: "testuser" }));
        const data = await result.json() as { success: boolean; deactivated: boolean };

        expect(result.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.deactivated).toBe(true);
    });

    it("returns 503 when 3proxy is not running", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue({
            username: "testuser",
            password: "hashedpass",
            isActive: true,
            deactivatedAt: null,
        } as any);
        mockExecAsync.mockRejectedValue(new Error("Service not found"));

        const result = await POST(createRequest({ username: "testuser" }));
        const data = await result.json() as { error: string };

        expect(result.status).toBe(503);
        expect(data.error).toBe("3proxy service is not running");
    });

    it("returns result when 3proxy is running and proxy test succeeds", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue({
            username: "testuser",
            password: "hashedpass",
            isActive: true,
            deactivatedAt: null,
        } as any);
        mockExecAsync
            .mockResolvedValueOnce({ stdout: "3proxy", stderr: "" })
            .mockResolvedValueOnce({ stdout: "{}", stderr: "" })
            .mockResolvedValue({ stdout: "", stderr: "" });

        const result = await POST(createRequest({ username: "testuser" }));
        const data = await result.json() as { success: boolean; data: { username: string; tests: Record<string, unknown> } };

        expect(data.success).toBe(true);
        expect(data.data.username).toBe("testuser");
        expect(data.data.tests).toHaveProperty("socks5");
    });

    it("returns 500 on unexpected error", async () => {
        mocked(prisma.proxyUser.findFirst).mockRejectedValue(new Error("DB error"));

        const result = await POST(createRequest({ username: "testuser" }));
        const data = await result.json() as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Failed to test proxy");
    });
});
