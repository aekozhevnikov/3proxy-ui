import { ProxyUser } from "@/src/core/definitions";

export const mockProxyUser: ProxyUser = {
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

export const mockUsersList: ProxyUser[] = [
    mockProxyUser,
    {
        ...mockProxyUser,
        id: 2,
        username: "anotheruser",
    },
];

export const setupPrismaMock = (mockProxyUser: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
}) => {
    jest.mock("@/prisma/db", () => {
        return {
            __esModule: true,
            default: { proxyUser: mockProxyUser },
            prisma: { proxyUser: mockProxyUser },
        };
    });
};

export const setupNextCacheMock = () => {
    jest.mock("next/cache", () => ({
        revalidatePath: jest.fn(),
    }));
};

export const setupConfigMock = () => {
    jest.mock("@/src/core/actions/config", () => ({
        update3proxyConfig: jest.fn(),
    }));
};