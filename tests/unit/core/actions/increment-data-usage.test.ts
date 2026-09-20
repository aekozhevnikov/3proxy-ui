import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { incrementDataUsage } from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";

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

describe("incrementDataUsage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

    it("converts bytes to MB and increments", async () => {
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
