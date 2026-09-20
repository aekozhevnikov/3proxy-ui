// Shared test helpers for change-credentials API tests
// jest.mock calls must be in each test file for proper hoisting

import { NextRequest } from "next/server";

export const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/auth/change-credentials", <RequestInit>{
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    });
};

export const setupMocks = () => {
    jest.clearAllMocks();
};

export const setCookiesMock = (value: string | undefined) => {
    const { cookies } = require("next/headers");
    cookies.mockReturnValue({
        get: jest.fn().mockReturnValue(value ? { value } : undefined)
    });
};

export const mockAuthenticatedUser = (
    user: Partial<{ id: number; username: string; password: string; name: string; isAdmin: boolean }> = {}
) => {
    const { cookies } = require("next/headers");
    cookies.mockReturnValue({
        get: jest.fn().mockReturnValue({ value: "valid-token" })
    });
    const jwt = require("jsonwebtoken");
    jwt.verify.mockReturnValue({ userId: 1 });
    const { prisma } = require("@/src/prisma/db");
    prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: "admin",
        password: "hashedpass",
        name: "Admin",
        isAdmin: true,
        ...user
    });
};
