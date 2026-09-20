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
    sign: jest.fn()
}));

jest.mock("@/src/core/config", () => ({
    app: {
        jwtSecret: "dev-secret-key-min-32-characters-long"
    }
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

const setupMocks = () => {
    jest.clearAllMocks();
    const { verify } = require("jsonwebtoken");
    verify.mockImplementation(() => ({ userId: 1 }));
    const { prisma } = require("@/src/prisma/db");
    prisma.user.findUnique.mockResolvedValue(createMockUser());
};

describe("auth/change-credentials API - error cases", () => {
    beforeEach(() => {
        setupMocks();
    });

    it("returns 500 when JWT verification throws", async () => {
        const { verify } = require("jsonwebtoken");
        verify.mockImplementation(() => {
            throw new Error("JWT error");
        });

        const result = await POST(createRequest({ username: "admin", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });

    it("returns 500 when database update fails due to conflict", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(null);
        const { update } = prisma.user;
        update.mockRejectedValue(new Error("Database error"));

        const result = await POST(createRequest({ username: "newusername", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });

    it("returns 500 when password hashing fails", async () => {
        const { prisma } = require("@/src/prisma/db");
        prisma.user.findUnique.mockResolvedValue(createMockUser());
        const { compare, hash } = require("bcrypt");
        compare.mockResolvedValue(true);
        const { findFirst } = prisma.user;
        findFirst.mockResolvedValue(null);
        hash.mockRejectedValue(new Error("Hashing failed"));

        const result = await POST(createRequest({ username: "newusername", currentPassword: "pass123" }));
        const data = await result.json();

        expect(result.status).toBe(500);
        expect(data.error).toBe("Internal server error");
    });
});
