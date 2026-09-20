/**
 * @jest-environment node
 */

import { POST } from "@/src/app/api/auth/login/route";
import { NextRequest } from "next/server";

jest.mock("@/src/prisma/db", () => {
    const mockUser = {
        findFirst: jest.fn()
    };
    return {
        __esModule: true,
        default: { user: mockUser },
        prisma: { user: mockUser }
    };
});

jest.mock("bcrypt", () => ({
    compare: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    sign: jest.fn().mockReturnValue("mock-token")
}));

jest.mock("@/src/core/config", () => ({
    app: {
        jwtSecret: "dev-secret-key-min-32-characters-long"
    }
}));

const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/auth/login", <RequestInit>{
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    });
};

const createMockUser = () => ({
    id: 1,
    username: "admin",
    password: "hashedpass",
    name: "Admin",
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

describe("auth/login API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 400 when username or password is missing", async () => {
        const result = await POST(createRequest({}));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(400);
        expect(data.error).toBe("Username and password are required");
    });

    it("returns 401 when user is not found", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findFirst.mockResolvedValue(null);

        const result = await POST(createRequest({ username: "admin", password: "pass123" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(401);
        expect(data.error).toBe("Invalid credentials");
    });

    it("returns 401 when password is incorrect", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findFirst.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(false);

        const result = await POST(createRequest({ username: "admin", password: "wrongpass" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(401);
        expect(data.error).toBe("Invalid credentials");
    });

    it("returns success with session cookie on valid login", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findFirst.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);

        const result = await POST(createRequest({ username: "admin", password: "pass123" }));
        const data = (await result.json()) as { success: boolean; user: Record<string, unknown> };

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user).toEqual({
            id: 1,
            username: "admin",
            name: "Admin",
            isAdmin: true
        });
        expect(result.headers.get("Set-Cookie")).toContain("session=");
    });
});
