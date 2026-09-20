/**
 * @jest-environment node
 */

import { GET } from "@/src/app/api/auth/session/route";

jest.mock("@/src/core/session", () => ({
    currentSession: jest.fn(),
}));

describe("auth/session API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns authorized session when currentSession returns authorized", async () => {
        const { currentSession } = require("@/src/core/session");
        currentSession.mockResolvedValue({ isAuthorized: true, userId: 1, username: "admin" });

        const result = await GET();
        const data = await result.json();

        expect(data).toEqual({ isAuthorized: true, userId: 1, username: "admin" });
    });

    it("returns unauthorized when currentSession returns unauthorized", async () => {
        const { currentSession } = require("@/src/core/session");
        currentSession.mockResolvedValue({ isAuthorized: false });

        const result = await GET();
        const data = await result.json();

        expect(data).toEqual({ isAuthorized: false });
    });

    it("returns unauthorized on error", async () => {
        const { currentSession } = require("@/src/core/session");
        currentSession.mockRejectedValue(new Error("Session error"));

        const result = await GET();
        const data = await result.json();

        expect(data).toEqual({ isAuthorized: false });
    });
});
