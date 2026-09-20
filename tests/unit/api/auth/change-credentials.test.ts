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
    cookies: jest.fn()
}));

const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/auth/change-credentials", <RequestInit>{
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    });
};

const createMockUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    username: "admin",
    password: "hashedpass",
    name: "Admin",
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
});

describe("auth/change-credentials API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 400 when username or currentPassword is missing", async () => {
        const result = await POST(createRequest({}));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(400);
        expect(data.error).toBe("Username and current password are required");
    });

    it("returns 401 when session cookie is missing", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue(undefined)
        });

        const result = await POST(createRequest({ username: "test", currentPassword: "pass123" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(401);
        expect(data.error).toBe("Not authenticated");
    });

    it("returns 401 when JWT verification fails", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "invalid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => {
            throw new Error("Invalid token");
        });

        const result = await POST(createRequest({ username: "test", currentPassword: "pass123" }));

        expect(result.status).toBe(500);
        expect(await result.json()).toEqual({ error: "Internal server error" });
    });

    it("returns 404 when user is not found", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(null);

        const result = await POST(createRequest({ username: "test", currentPassword: "pass123" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(404);
        expect(data.error).toBe("User not found");
    });

    it("returns 401 when current password is incorrect", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(false);

        const result = await POST(createRequest({ username: "admin", currentPassword: "wrongpass" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(401);
        expect(data.error).toBe("Current password is incorrect");
    });

    it("returns 400 when new username is already taken", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(createMockUser());

        const result = await POST(createRequest({ username: "newuser", currentPassword: "pass123" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(400);
        expect(data.error).toBe("Username is already taken");
    });

    it("updates username only when username changes", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(null);
        const { update } = prisma.user;
        update.mockResolvedValue(createMockUser());

        const result = await POST(createRequest({ username: "newadmin", currentPassword: "pass123" }));
        const data = (await result.json()) as { success: boolean };

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { username: "newadmin" }
        });
        const { hash } = require("bcrypt");
        expect(hash).not.toHaveBeenCalled();
    });

    it("updates password when newPassword is provided", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare, hash } = require("bcrypt");
        compare.mockResolvedValue(true);
        hash.mockResolvedValue("new-hashed-password");
        const { update } = prisma.user;
        update.mockResolvedValue(createMockUser());

        const result = await POST(
            createRequest({ username: "admin", currentPassword: "pass123", newPassword: "newpass456" })
        );
        const data = (await result.json()) as { success: boolean };

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
        expect(hash).toHaveBeenCalledWith("newpass456", 10);
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { username: "admin", password: "new-hashed-password" }
        });
    });

    it("returns 500 on unexpected error", async () => {
        const { cookies } = require("next/headers");
        cookies.mockReturnValue({
            get: jest.fn().mockReturnValue({ value: "valid-token" })
        });
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockRejectedValue(new Error("DB error"));

        const result = await POST(createRequest({ username: "test", currentPassword: "pass123" }));
        const data = (await result.json()) as { error: string };

        expect(result.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });
});
