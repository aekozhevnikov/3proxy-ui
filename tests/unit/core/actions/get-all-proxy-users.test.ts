import { mocked } from '@/tests/unit/test-utils/mock-helpers';
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

import { getAllProxyUsers } from "@/src/core/actions/proxy-user";

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
    dataUsed: 0,
};

describe("getAllProxyUsers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns users with dataLimit and dataUsed as numbers", async () => {
        const mockUsers = [{ ...mockUser, dataLimit: 10240n, dataUsed: 500n }];
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
        mocked(prisma.proxyUser.findMany).mockResolvedValue([{ ...mockUser, dataLimit: null, dataUsed: 0n }]);

        const result = await getAllProxyUsers();
        expect(result[0].dataLimit).toBeNull();
    });
});