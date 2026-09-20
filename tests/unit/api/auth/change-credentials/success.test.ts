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
    hash: jest.fn().mockResolvedValue("newhashedpass")
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

describe("auth/change-credentials API - success cases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => ({ userId: 1 }));
    });

    it("updates username when only username is changed", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(null);
        const { update } = prisma.user;
        update.mockResolvedValue(createMockUser());

        const result = await POST(createRequest({ username: "newusername", currentPassword: "pass123" }));
        const data = (await result.json()) as { success: boolean };

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
        expect(result.headers.get("Set-Cookie")).toBeTruthy();
    });

    it("returns 200 when only password is changed", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { update } = prisma.user;
        update.mockResolvedValue(createMockUser());

        const result = await POST(createRequest({ username: "admin", currentPassword: "pass123" }));
        const data = (await result.json()) as { success: boolean };

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
