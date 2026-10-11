/**
 * @jest-environment node
 */

import jwt from "jsonwebtoken";

import { currentSession } from "@/src/core/session";
import { prisma } from "@/src/prisma/db";

const SECRET = "test-secret-key-at-least-32-characters";

jest.mock("@/src/core/config", () => ({
    app: { jwtSecret: "test-secret-key-at-least-32-characters" }
}));

jest.mock("@/src/prisma/db", () => ({
    prisma: { user: { findUnique: jest.fn() } }
}));

jest.mock("next/headers", () => ({
    cookies: jest.fn()
}));

const mockedFindUnique = prisma.user.findUnique as jest.Mock;

function signToken(payload: Record<string, unknown>): string {
    return jwt.sign({ userId: 1, username: "admin", aud: "3proxy-ui", iss: "3proxy-ui", ...payload }, SECRET, {
        algorithm: "HS256",
        expiresIn: 3600
    });
}

async function withCookie(token: string) {
    const { cookies } = require("next/headers");

    cookies.mockResolvedValue({ get: jest.fn().mockReturnValue({ value: token }) });
}

describe("currentSession on the server", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("authorises when the account exists and the version matches", async () => {
        await withCookie(signToken({ sessionVersion: 2 }));
        mockedFindUnique.mockResolvedValue({ sessionVersion: 2 });

        const session = await currentSession();

        expect(session.isAuthorized).toBe(true);
        expect(session.userId).toBe(1);
    });

    it("refuses a token whose sessionVersion is behind the stored one", async () => {
        // A password change bumps the stored version, so tokens minted before
        // it must stop working immediately rather than at the end of their hour.
        await withCookie(signToken({ sessionVersion: 1 }));
        mockedFindUnique.mockResolvedValue({ sessionVersion: 2 });

        const session = await currentSession();

        expect(session.isAuthorized).toBe(false);
    });

    it("refuses a token for an account that no longer exists", async () => {
        await withCookie(signToken({ sessionVersion: 0 }));
        mockedFindUnique.mockResolvedValue(null);

        const session = await currentSession();

        expect(session.isAuthorized).toBe(false);
    });

    it("treats a token without sessionVersion as version zero", async () => {
        await withCookie(signToken({}));
        mockedFindUnique.mockResolvedValue({ sessionVersion: 0 });

        const session = await currentSession();

        expect(session.isAuthorized).toBe(true);
    });
});
