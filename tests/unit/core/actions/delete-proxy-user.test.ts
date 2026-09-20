import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { deleteProxyUser } from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";
import { ProxyUser } from "@/src/core/definitions";

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

const mockUser: ProxyUser = {
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

describe("deleteProxyUser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("deletes a proxy user when found", async () => {
        mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: BigInt(10240), dataUsed: BigInt(0) });
        mocked(prisma.proxyUser.delete).mockResolvedValue({ ...mockUser, dataLimit: BigInt(10240), dataUsed: BigInt(0) });

        await deleteProxyUser(1);

        expect(prisma.proxyUser.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("throws when user not found", async () => {
        mocked(prisma.proxyUser.findUnique).mockResolvedValue(null);

        await expect(deleteProxyUser(999)).rejects.toThrow("not found");
    });
});
