import {
    getAllProxyUsers,
    getProxyUserById,
    createProxyUser,
    updateProxyUser,
    deleteProxyUser,
    incrementDataUsage,
} from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";
import { NewProxyUserRequest, EditProxyUserRequest } from "@/src/core/definitions";

jest.mock("@/prisma/db", () => {
    const mockProxyUser = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    return {
        __esModule: true,
        default: { proxyUser: mockProxyUser },
        prisma: { proxyUser: mockProxyUser },
    };
});

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

jest.mock("@/src/core/actions/config", () => ({
    update3proxyConfig: jest.fn(),
}));

import { mocked } from "@/tests/unit/test-utils/mock-helpers";

const mockUser = {
    id: 1,
    username: "testuser",
    password: "hashedpass",
    isActive: true,
    dataLimit: 10240,
    ipLimit: 1,
    telegramUserId: null,
    expiresAt: null,
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    dataUsed: 500,
};

const mockUsers = [
    {
        ...mockUser,
        dataLimit: 10240n,
        dataUsed: 500n,
    },
    {
        ...mockUser,
        id: 2,
        username: "user2",
        dataLimit: 5120n,
        dataUsed: 1000n,
    },
];

describe("proxy-user actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getAllProxyUsers", () => {
        it("returns users with dataLimit and dataUsed as numbers", async () => {
            mocked(prisma.proxyUser.findMany).mockResolvedValue(mockUsers);

            const result = await getAllProxyUsers();

            expect(result[0].dataLimit).toBe(10240);
            expect(result[0].dataUsed).toBe(500);
        });

        it("returns users sorted by createdAt descending", async () => {
            mocked(prisma.proxyUser.findMany).mockResolvedValue([{ ...mockUser, dataLimit: 10240n, dataUsed: 0n }]);

            await getAllProxyUsers();

            expect(prisma.proxyUser.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: "desc" },
            });
        });

        it("handles null dataLimit", async () => {
            mocked(prisma.proxyUser.findMany).mockResolvedValue([
                { ...mockUser, dataLimit: null, dataUsed: 0n },
            ]);

            const result = await getAllProxyUsers();

            expect(result[0].dataLimit).toBeNull();
        });
    });

    describe("getProxyUserById", () => {
        it("returns user with matching id", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });

            const result = await getProxyUserById(1);

            expect(result).toEqual(expect.objectContaining({
                id: 1,
                username: "testuser",
            }));
            expect(prisma.proxyUser.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("returns null when user not found", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue(null);

            const result = await getProxyUserById(999);

            expect(result).toBeNull();
        });
    });

    describe("createProxyUser", () => {
        const pastDate = new Date("2020-01-01");

        it("creates a new proxy user with default values", async () => {
            const data: NewProxyUserRequest = {
                username: "newuser",
                password: "pass123",
            };

            mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);
            mocked(prisma.proxyUser.create).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });

            const result = await createProxyUser(data);

            expect(prisma.proxyUser.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        username: "newuser",
                        isActive: true,
                        ipLimit: 1,
                    }),
                })
            );
            expect(result.username).toBe("testuser");
        });

        it("throws when username already exists", async () => {
            const data: NewProxyUserRequest = {
                username: "existinguser",
                password: "pass123",
            };

            mocked(prisma.proxyUser.findFirst).mockResolvedValue({ ...mockUser, id: 99, dataLimit: BigInt(10240), dataUsed: BigInt(500) });

            await expect(createProxyUser(data)).rejects.toThrow("already exists");
        });

        it("throws when expired date is in past and user is active", async () => {
            mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

            const data: NewProxyUserRequest = {
                username: "expireduser",
                password: "pass123",
                isActive: true,
                expiresAt: pastDate,
            };

            await expect(createProxyUser(data)).rejects.toThrow("expired or past expiration date");
        });

        it("allows creating inactive user with past expiration", async () => {
            const data: NewProxyUserRequest = {
                username: "inactiveuser",
                password: "pass123",
                isActive: false,
                expiresAt: pastDate,
            };

            mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);
            mocked(prisma.proxyUser.create).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });

            const result = await createProxyUser(data);
            expect(result).toBeDefined();
        });
    });

    describe("updateProxyUser", () => {
        it("updates user username and keeps isActive true", async () => {
            const data: EditProxyUserRequest = {
                id: 1,
                username: "updateduser",
            };

            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n, isActive: true });
            mocked(prisma.proxyUser.update).mockResolvedValue({ ...mockUser, username: "updateduser", dataLimit: 10240n, dataUsed: 0n });

            const result = await updateProxyUser(data);

            expect(prisma.proxyUser.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    username: "updateduser",
                    isActive: true,
                }),
            });
            expect(result.username).toBe("updateduser");
        });

        it("throws when user not found", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue(null);
            const data: EditProxyUserRequest = {
                id: 999,
                username: "nonexistent",
            };

            await expect(updateProxyUser(data)).rejects.toThrow("not found");
        });

        it("throws when activating with past expiration date", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, isActive: false, dataLimit: 10240n, dataUsed: 0n });
            const pastDate = new Date("2020-01-01");
            const data: EditProxyUserRequest = {
                id: 1,
                username: "testuser",
                isActive: true,
                expiresAt: pastDate,
            };

            await expect(updateProxyUser(data)).rejects.toThrow("expired or past expiration date");
        });

        it("sets deactivatedAt when deactivating", async () => {
            const data: EditProxyUserRequest = {
                id: 1,
                username: "testuser",
                isActive: false,
            };

            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n, isActive: true });
            mocked(prisma.proxyUser.update).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });

            await updateProxyUser(data);

            expect(prisma.proxyUser.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    deactivatedAt: expect.any(Date),
                }),
            });
        });

        it("clears deactivatedAt when reactivating", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, isActive: false, dataLimit: 10240n, dataUsed: 0n });
            mocked(prisma.proxyUser.update).mockResolvedValue({ ...mockUser, isActive: true, dataLimit: 10240n, dataUsed: 0n });
            const data: EditProxyUserRequest = {
                id: 1,
                username: "testuser",
                isActive: true,
            };

            await updateProxyUser(data);

            expect(prisma.proxyUser.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    deactivatedAt: null,
                }),
            });
        });
    });

    describe("deleteProxyUser", () => {
        it("deletes user successfully", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });
            mocked(prisma.proxyUser.delete).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });

            await deleteProxyUser(1);

            expect(prisma.proxyUser.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it("throws when user not found", async () => {
            mocked(prisma.proxyUser.findUnique).mockResolvedValue(null);

            await expect(deleteProxyUser(999)).rejects.toThrow("not found");
        });
    });

    describe("incrementDataUsage", () => {
        const mockProxyUser = {
            id: 1,
            username: "testuser",
            password: "hashedpass",
            isActive: true,
            dataLimit: BigInt(10240),
            ipLimit: 1,
            telegramUserId: null,
            expiresAt: null,
            deactivatedAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            dataUsed: BigInt(0),
        };

        it("increments data usage by given bytes divided by 1MB", async () => {
            mocked(prisma.proxyUser.update).mockResolvedValue(mockProxyUser);

            await incrementDataUsage("testuser", 1048576);

            expect(prisma.proxyUser.update).toHaveBeenCalledWith({
                where: { username: "testuser" },
                data: {
                    dataUsed: {
                        increment: 1,
                    },
                },
            });
        });

        it("handles zero bytes", async () => {
            mocked(prisma.proxyUser.update).mockResolvedValue(mockProxyUser);

            await incrementDataUsage("testuser", 0);

            expect(prisma.proxyUser.update).toHaveBeenCalledWith({
                where: { username: "testuser" },
                data: {
                    dataUsed: {
                        increment: 0,
                    },
                },
            });
        });
    });
});
