/**
 * @jest-environment jsdom
 */
import jwt from "jsonwebtoken";

describe("session", () => {
    const JWT_SECRET = "dev-secret-key-min-32-characters-long";

    beforeEach(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });

    describe("currentSession - client side", () => {
        it("returns unauthorized when no session cookie exists", async () => {
            jest.resetModules();

            const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
            Object.defineProperty(document, "cookie", {
                configurable: true,
                get: () => "",
            });

            const { currentSession } = require("@/src/core/session");
            const result = await currentSession();
            expect(result).toEqual({ isAuthorized: false });

            if (originalCookieDescriptor) {
                Object.defineProperty(document, "cookie", originalCookieDescriptor);
            }
        });

        it("returns authorized when valid session token is present in cookie", async () => {
            const mockPayload = { userId: 1, username: "admin" };
            const token = jwt.sign(mockPayload, JWT_SECRET, {
                audience: "3proxy-ui",
                issuer: "3proxy-ui",
                algorithm: "HS256",
            });

            jest.resetModules();

            const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
            Object.defineProperty(document, "cookie", {
                configurable: true,
                get: () => `session=${token}`,
            });

            const { currentSession } = require("@/src/core/session");
            const result = await currentSession();
            expect(result.isAuthorized).toBe(true);

            if (originalCookieDescriptor) {
                Object.defineProperty(document, "cookie", originalCookieDescriptor);
            }
        });

        it("returns unauthorized when invalid session token is present", async () => {
            jest.resetModules();

            const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
            Object.defineProperty(document, "cookie", {
                configurable: true,
                get: () => "session=invalid.token.here",
            });

            const { currentSession } = require("@/src/core/session");
            const result = await currentSession();
            expect(result).toEqual({ isAuthorized: false });

            if (originalCookieDescriptor) {
                Object.defineProperty(document, "cookie", originalCookieDescriptor);
            }
        });
    });
});
