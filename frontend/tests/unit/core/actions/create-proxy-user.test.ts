import { mocked } from "@/tests/unit/test-utils/mock-helpers";
import { createProxyUser } from "@/src/core/actions/proxy-user";
import prisma from "@/prisma/db";
import { NewProxyUserRequest } from "@/src/core/definitions";

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
    password: "hashedpass",
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

describe("createProxyUser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);
        mocked(prisma.proxyUser.create).mockResolvedValue({
            ...mockUser,
            dataLimit: BigInt(10240),
            dataUsed: BigInt(0)
        });
    });

    it("creates a proxy user with default values", async () => {
        const data: NewProxyUserRequest = {
            username: "newuser",
            password: "pass123"
        };

        const result = await createProxyUser(data);

        expect(prisma.proxyUser.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    username: "newuser",
                    isActive: true,
                    ipLimit: 1
                })
            })
        );
        expect(result.username).toBe(mockUser.username);
    });

    it("throws when username already exists", async () => {
        const data: NewProxyUserRequest = {
            username: "existinguser",
            password: "pass123"
        };
        mocked(prisma.proxyUser.findFirst).mockResolvedValue({
            ...mockUser,
            id: 2,
            username: "existinguser",
            dataLimit: BigInt(10240),
            dataUsed: BigInt(0)
        });

        await expect(createProxyUser(data)).rejects.toThrow("already exists");
    });

    it("throws when expired date is in past and user is active", async () => {
        const pastDate = new Date("2020-01-01");
        const data: NewProxyUserRequest = {
            username: "expireduser",
            password: "pass123",
            isActive: true,
            expiresAt: pastDate
        };

        await expect(createProxyUser(data)).rejects.toThrow("expired or past expiration date");
    });

    it("allows creating inactive user with past expiration", async () => {
        const pastDate = new Date("2020-01-01");
        const data: NewProxyUserRequest = {
            username: "inactiveuser",
            password: "pass123",
            isActive: false,
            expiresAt: pastDate
        };

        const result = await createProxyUser(data);
        expect(result).toBeDefined();
    });

    it("rejects a username containing whitespace", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

        await expect(createProxyUser({ username: "bad name", password: "p" } as never)).rejects.toThrow(
            /Username may only contain/
        );
    });

    it("rejects a username containing a colon", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

        // A colon is what separates the fields in a 3proxy user entry, so a
        // username carrying one can add entries the panel cannot see or revoke.
        await expect(createProxyUser({ username: "a:b", password: "p" } as never)).rejects.toThrow(
            /Username may only contain/
        );
    });

    it("rejects a username with a newline", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

        await expect(createProxyUser({ username: "a\nflush", password: "p" } as never)).rejects.toThrow(
            /Username may only contain/
        );
    });

    it("rejects an empty username", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);

        await expect(createProxyUser({ username: "", password: "p" } as never)).rejects.toThrow(
            /Username may only contain/
        );
    });

    it("accepts an ordinary username", async () => {
        mocked(prisma.proxyUser.findFirst).mockResolvedValue(null);
        mocked(prisma.proxyUser.create).mockResolvedValue({ ...mockUser, username: "ok.name_1-2" } as never);

        const result = await createProxyUser({ username: "ok.name_1-2", password: "p" } as never);

        expect(result.username).toBe("ok.name_1-2");
    });
});
