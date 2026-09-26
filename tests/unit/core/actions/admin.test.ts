import { mocked } from "@/tests/unit/test-utils/mock-helpers";
import { ensureAdminUser, ensureAdminExists } from "@/src/core/actions/admin";
import { prisma } from "@/src/prisma/db";
import bcrypt from "bcrypt";

jest.mock("@/src/prisma/db", () => ({
    prisma: {
        user: {
            findFirst: jest.fn(),
            create: jest.fn()
        },
        proxyUser: {
            findFirst: jest.fn(),
            create: jest.fn()
        }
    }
}));

const mockUserCreateResult = {
    id: 1,
    username: "admin",
    password: "hashed_password",
    name: "Admin User",
    isAdmin: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const mockProxyUserCreateResult = {
    id: 1,
    username: "admin",
    password: "hashed_password",
    isActive: true,
    dataLimit: 0n,
    dataUsed: 0n,
    ipLimit: 1,
    telegramUserId: null as string | null,
    deactivatedAt: null as Date | null,
    expiresAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date()
};

jest.mock("bcrypt", () => ({
    hash: jest.fn()
}));

describe("admin actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mocked(bcrypt.hash) as unknown as jest.Mock<Promise<string>>).mockResolvedValue(
            Promise.resolve("hashed_password_123")
        );
        mocked(prisma.user.findFirst).mockResolvedValue(null);
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);
        mocked(prisma.user.create).mockResolvedValue(mockUserCreateResult);
        mocked(prisma.proxyUser.create).mockResolvedValue(mockProxyUserCreateResult);
    });

    describe("ensureAdminUser", () => {
        it("returns null when admin already exists and doesn't create user", async () => {
            mocked(prisma.user.findFirst).mockResolvedValue({ username: "admin" } as unknown as {
                id: number;
                username: string;
                password: string;
                name: string;
                isAdmin: boolean;
                createdAt: Date;
                updatedAt: Date;
            });
            mocked(prisma.proxyUser.findFirst).mockResolvedValue({ username: "admin" } as unknown as {
                id: number;
                username: string;
                password: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                dataLimit: bigint;
                dataUsed: bigint;
                ipLimit: number;
                telegramUserId: string;
                deactivatedAt: Date;
                expiresAt: Date;
            });

            const result = await ensureAdminUser();
            expect(result).toBeNull();
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it("creates admin user when doesn't exist", async () => {
            const result = await ensureAdminUser();
            expect(result).toEqual({ username: "admin", password: expect.any(String) });
            expect(prisma.user.create).toHaveBeenCalled();
            expect(prisma.proxyUser.create).toHaveBeenCalled();
        });

        it("uses environment variables for admin credentials", async () => {
            const result = await ensureAdminUser();
            expect(bcrypt.hash).toHaveBeenCalledWith("admin", 10);
            expect(result?.username).toBe("admin");
        });

        it("uses overrides when provided", async () => {
            const result = await ensureAdminUser({ username: "custom", password: "custompass" });
            expect(bcrypt.hash).toHaveBeenCalledWith("custompass", 10);
            expect(result?.username).toBe("custom");
        });

        it("does not create proxy user when admin proxy user already exists", async () => {
            mocked(prisma.user.findFirst).mockResolvedValue(null);
            mocked(prisma.proxyUser.findFirst).mockResolvedValue({ username: "admin" } as unknown as {
                id: number;
                username: string;
                password: string;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                dataLimit: bigint;
                dataUsed: bigint;
                ipLimit: number;
                telegramUserId: string;
                deactivatedAt: Date;
                expiresAt: Date;
            });

            expect(prisma.proxyUser.create).not.toHaveBeenCalled();
        });

        it("rethrows error on database failure", async () => {
            mocked(prisma.user.findFirst).mockRejectedValue(new Error("DB error"));

            await expect(ensureAdminUser()).rejects.toThrow("DB error");
        });
    });

    describe("ensureAdminExists", () => {
        it("catches errors and resolves to undefined", async () => {
            mocked(prisma.user.findFirst).mockRejectedValue(new Error("DB error"));

            await expect(ensureAdminExists()).resolves.toBeUndefined();
        });

        it("calls ensureAdminUser successfully", async () => {
            mocked(prisma.user.findFirst).mockResolvedValue({ username: "admin" } as unknown as {
                id: number;
                username: string;
                password: string;
                name: string;
                isAdmin: boolean;
                createdAt: Date;
                updatedAt: Date;
            });

            await ensureAdminExists();
            expect(prisma.user.findFirst).toHaveBeenCalledWith({
                where: { isAdmin: true },
                select: { username: true }
            });
        });
    });
});
