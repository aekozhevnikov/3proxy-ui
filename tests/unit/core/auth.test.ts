/**
 * @jest-environment node
 */

import { requireAdmin } from "@/src/core/auth";
import { currentSession } from "@/src/core/session";
import { prisma } from "@/src/prisma/db";

jest.mock("@/src/core/session", () => ({
    currentSession: jest.fn()
}));

jest.mock("@/src/prisma/db", () => ({
    prisma: {
        user: {
            findUnique: jest.fn()
        }
    }
}));

const mockedSession = currentSession as jest.MockedFunction<typeof currentSession>;
const mockedFindUnique = prisma.user.findUnique as jest.Mock;

describe("requireAdmin", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("denies with 401 when there is no session", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: false });

        const result = await requireAdmin();

        expect(result.denial?.status).toBe(401);
        expect(result.user).toBeUndefined();
    });

    it("denies with 401 when the session carries no user id", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, username: "someone" });

        const result = await requireAdmin();

        expect(result.denial?.status).toBe(401);
    });

    it("does not query the database when there is no session", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: false });

        await requireAdmin();

        expect(mockedFindUnique).not.toHaveBeenCalled();
    });

    it("denies with 403 when the account no longer exists", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, userId: 7, username: "gone" });
        mockedFindUnique.mockResolvedValue(null);

        const result = await requireAdmin();

        expect(result.denial?.status).toBe(403);
    });

    it("denies with 403 when the account is no longer an admin", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, userId: 7, username: "demoted" });
        mockedFindUnique.mockResolvedValue({ id: 7, username: "demoted", isAdmin: false });

        const result = await requireAdmin();

        expect(result.denial?.status).toBe(403);
        expect(result.user).toBeUndefined();
    });

    it("allows an admin and returns the identity from the database", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, userId: 7, username: "stale-name" });
        mockedFindUnique.mockResolvedValue({ id: 7, username: "current-name", isAdmin: true });

        const result = await requireAdmin();

        expect(result.denial).toBeNull();
        expect(result.user).toEqual({ id: 7, username: "current-name" });
    });

    it("looks the role up on every call, so a de-admin takes effect immediately", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, userId: 7, username: "admin" });
        mockedFindUnique.mockResolvedValue({ id: 7, username: "admin", isAdmin: true });

        const first = await requireAdmin();

        mockedFindUnique.mockResolvedValue({ id: 7, username: "admin", isAdmin: false });
        const second = await requireAdmin();

        expect(first.denial).toBeNull();
        expect(second.denial?.status).toBe(403);
    });

    it("selects only what the check needs", async () => {
        mockedSession.mockResolvedValue({ isAuthorized: true, userId: 7, username: "admin" });
        mockedFindUnique.mockResolvedValue({ id: 7, username: "admin", isAdmin: true });

        await requireAdmin();

        expect(mockedFindUnique).toHaveBeenCalledWith({
            where: { id: 7 },
            select: { id: true, username: true, isAdmin: true }
        });
    });
});
