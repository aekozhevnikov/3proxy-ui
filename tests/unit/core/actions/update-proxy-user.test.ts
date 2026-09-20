import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { updateProxyUser } from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";
import { EditProxyUserRequest, ProxyUser } from "@/src/core/definitions";

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

describe("updateProxyUser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocked(prisma.proxyUser.findUnique).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n, isActive: true });
        mocked(prisma.proxyUser.update).mockResolvedValue({ ...mockUser, dataLimit: 10240n, dataUsed: 0n });
    });

    it("updates user with provided data", async () => {
        const data: EditProxyUserRequest = {
            id: 1,
            username: "updateduser",
        };

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
