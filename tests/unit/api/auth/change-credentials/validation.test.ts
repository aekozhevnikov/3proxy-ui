/**
 * @jest-environment node
 */

import { POST } from "@/src/app/api/auth/change-credentials/route";
import { NextRequest } from "next/server";

jest.mock("@/src/prisma/db", () => {
    const mockUser = {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    };
    return {
        __esModule: true,
        default: { user: mockUser },
        prisma: { user: mockUser }
    };
});

jest.mock("bcrypt", () => ({
    compare: jest.fn(),
    hash: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(),
    sign: jest.fn().mockReturnValue("mock-new-token")
}));

jest.mock("@/src/core/config", () => ({
    app: {
        jwtSecret: "dev-secret-key-min-32-characters-long"
    }
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn(() => ({
        get: jest.fn().mockReturnValue({ value: "valid-token" })
    }))
}));

const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/auth/change-credentials", <RequestInit>{
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

describe("auth/change-credentials API - validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
    });

    it("returns 400 when username or current password is missing", async () => {
        const result = await POST(createRequest({ username: "admin" }));
        const data = await result.json();

        expect(result.status).toBe(400);
        expect(data.error).toBe("Username and current password are required");
    });

    it("returns 401 when session cookie is missing", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValueOnce({
            get: jest.fn().mockReturnValue(undefined)
        });

        const result = await POST(createRequest({ username: "test", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(401);
        expect(data.error).toBe("Not authenticated");
    });

    it("returns 401 when JWT payload is invalid", async () => {
        const { verify } = require("jsonwebtoken");
        verify.mockReturnValue({ foo: "bar" });

        const result = await POST(createRequest({ username: "admin", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(401);
        expect(data.error).toBe("Invalid session");
    });

    it("returns 404 when user is not found", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await POST(createRequest({ username: "admin", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(404);
        expect(data.error).toBe("User not found");
    });

    it("returns 401 when current password is incorrect", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(false);

        const result = await POST(createRequest({ username: "admin", currentPassword: "wrongpass" }));
        const data = await result.json();

        expect(result.status).toBe(401);
        expect(data.error).toBe("Current password is incorrect");
    });

    it("returns 400 when new username is already taken", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(createMockUser());

        const result = await POST(createRequest({ username: "newuser", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(400);
        expect(data.error).toBe("Username is already taken");
    });
});
