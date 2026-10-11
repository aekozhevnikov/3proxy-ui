import { mocked } from "@/tests/unit/test-utils/mock-helpers";
import { getProxyUserById } from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";

jest.mock("@/src/core/auth", () => ({
    assertAdmin: jest.fn(async () => ({ id: 1, username: "admin" })),
    resolveAdmin: jest.fn(async () => ({ id: 1, username: "admin" })),
    requireAdmin: jest.fn(async () => ({ user: { id: 1, username: "admin" }, denial: null }))
}));

jest.mock("@/prisma/db", () => {
    const mockProxyUser = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    };
    return {
        __esModule: true,
        default: { proxyUser: mockProxyUser },
        prisma: { proxyUser: mockProxyUser }
    };
});

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn()
}));

jest.mock("@/src/core/actions/config", () => ({
    update3proxyConfig: jest.fn()
}));

const mockUser = {
    id: 1,
    username: "testuser",
    isActive: true,
    dataLimit: 10240,
    ipLimit: 1,
    telegramUserId: null,
    expiresAt: null,
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    dataUsed: 0
};

describe("getProxyUserById", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns user when found", async () => {
        mocked(prisma.proxyUser.findUnique).mockResolvedValue({
            ...mockUser,
            id: 1,
            username: "testuser",
            dataLimit: 10240n,
            dataUsed: 0n
        } as never);
        const result = await getProxyUserById(1);

        expect(result).toEqual(
            expect.objectContaining({
                id: 1,
                username: "testuser"
            })
        );
        expect(prisma.proxyUser.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
    });

    it("never returns the password", async () => {
        mocked(prisma.proxyUser.findUnique).mockResolvedValue({
            ...mockUser,
            id: 1,
            dataLimit: 10240n,
            dataUsed: 0n
        } as never);

        const result = await getProxyUserById(1);

        expect(result).not.toHaveProperty("password");
    });

    it("returns null when user not found", async () => {
        mocked(prisma.proxyUser.findUnique).mockResolvedValue(null);

        const result = await getProxyUserById(999);

        expect(result).toBeNull();
    });
});
