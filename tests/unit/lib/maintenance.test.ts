/**
 * @jest-environment node
 */
import { processTrafficLimits, processExpiration, TrafficSyncParams } from "@/src/lib/maintenance";
import { prisma } from "@/src/prisma/db";

jest.mock("@/src/prisma/db", () => {
    const mockProxyUser = {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    };
    return {
        __esModule: true,
        prisma: { proxyUser: mockProxyUser },
        default: { proxyUser: mockProxyUser }
    };
});

jest.mock("@/src/lib/telegram-notifications", () => ({
    sendTelegramNotification: jest.fn()
}));

jest.mock("@/src/core/logger", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

const mockPrisma = require("@/src/prisma/db").prisma;

describe("maintenance - processTrafficLimits", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Prisma mock returns BigInt as Numbers in JSON serialization
    // But the actual schema defines them as BigInt, so we use BigInt in the code
    // Prisma mock returns BigInt as Number strings in some contexts, but we use BigInt in code
    const createMockUser = (overrides: any = {}) => ({
        id: 1,
        username: "testuser",
        dataUsed: BigInt(0),
        dataLimit: null,
        isActive: true,
        telegramUserId: null,
        password: "hashed",
        ...overrides
    });

    it("accumulates traffic data correctly", async () => {
        const user = createMockUser({ id: 2, username: "testuser" });
        mockPrisma.proxyUser.findFirst.mockResolvedValue(user);
        mockPrisma.proxyUser.update.mockResolvedValue({});

        // 1024 + 2048 = 3072 bytes
        const trafficMap: TrafficSyncParams["trafficMap"] = new Map([
            ["testuser", { sent: 1024, received: 2048, requests: 10 }]
        ]);

        const result = await processTrafficLimits({ trafficMap, now: new Date() });

        expect(result.totalTraffic).toBe(3072);
        expect(result.updatedCount).toBe(1);

        const updateCall = mockPrisma.proxyUser.update.mock.calls[0];
        expect(updateCall[0].where).toEqual({ id: 2 });
        // dataUsed should be a BigInt
        expect(typeof updateCall[0].data.dataUsed).toBe("bigint");
        expect(updateCall[0].data.dataUsed).toBe(BigInt(3072));
    });

    it("handles large numbers without precision loss", async () => {
        const user = createMockUser({ id: 5 });
        mockPrisma.proxyUser.findFirst.mockResolvedValue(user);
        mockPrisma.proxyUser.update.mockResolvedValue({});

        const trafficMap: TrafficSyncParams["trafficMap"] = new Map([
            ["testuser", { sent: 2147483648, received: 2147483648, requests: 100 }]
        ]);

        await processTrafficLimits({ trafficMap, now: new Date() });

        const updateCall = mockPrisma.proxyUser.update.mock.calls[0];
        expect(typeof updateCall[0].data.dataUsed).toBe("bigint");
        expect(updateCall[0].data.dataUsed).toBe(BigInt(4294967296));
    });

    it("deactivates user when data limit exceeded", async () => {
        // dataLimit is in MB, so 1MB = 1024*1024 bytes
        // dataUsed = 900000 bytes, traffic = 200000 bytes, total = 1100000 bytes
        // dataLimit 1000000 MB = 1000000 * 1024 * 1024 = 1048576000000 bytes
        // 1100000 < 1048576000000, so user should NOT be deactivated

        // To trigger deactivation, set dataLimit very low (0.001 MB ≈ 1024 bytes)
        const user = createMockUser({
            id: 3,
            username: "limituser",
            dataUsed: BigInt(0),
            dataLimit: BigInt(0) // 0 MB limit means any usage triggers deactivation
        });
        mockPrisma.proxyUser.findFirst.mockResolvedValue(user);
        mockPrisma.proxyUser.update.mockResolvedValue({});

        const trafficMap: TrafficSyncParams["trafficMap"] = new Map([
            ["limituser", { sent: 100000, received: 100000, requests: 50 }]
        ]);

        const result = await processTrafficLimits({ trafficMap, now: new Date() });

        expect(result.deactivatedCount).toBe(1);

        // First call updates dataUsed
        const dataUpdate = mockPrisma.proxyUser.update.mock.calls[0];
        expect(typeof dataUpdate[0].data.dataUsed).toBe("bigint");
        expect(Number(dataUpdate[0].data.dataUsed)).toBe(200000);

        // Second call deactivates
        const deactivateUpdate = mockPrisma.proxyUser.update.mock.calls[1];
        expect(deactivateUpdate[0].data.isActive).toBe(false);
        expect(deactivateUpdate[0].data.deactivatedAt).toBeInstanceOf(Date);
    });

    it("accumulates traffic across multiple log entries", async () => {
        const user1 = createMockUser({ id: 1, username: "testuser" });
        const user2 = createMockUser({ id: 2, username: "otheruser" });

        mockPrisma.proxyUser.findFirst
            .mockResolvedValueOnce(user1)
            .mockResolvedValueOnce(user2);

        mockPrisma.proxyUser.update.mockResolvedValue({});

        const trafficMap: TrafficSyncParams["trafficMap"] = new Map([
            ["testuser", { sent: 1024, received: 2048, requests: 10 }],
            ["otheruser", { sent: 512, received: 256, requests: 5 }]
        ]);

        const result = await processTrafficLimits({ trafficMap, now: new Date() });

        expect(result.totalTraffic).toBe(3840); // 3072 + 768
        expect(result.updatedCount).toBe(2);

        const firstUpdate = mockPrisma.proxyUser.update.mock.calls[0];
        expect(firstUpdate[0].where).toEqual({ id: 1 });
        expect(typeof firstUpdate[0].data.dataUsed).toBe("bigint");
        expect(Number(firstUpdate[0].data.dataUsed)).toBe(3072);

        const secondUpdate = mockPrisma.proxyUser.update.mock.calls[1];
        expect(secondUpdate[0].where).toEqual({ id: 2 });
        expect(typeof secondUpdate[0].data.dataUsed).toBe("bigint");
        expect(Number(secondUpdate[0].data.dataUsed)).toBe(768);
    });

    it("skips unknown users in traffic map", async () => {
        mockPrisma.proxyUser.findFirst.mockResolvedValue(null);

        const trafficMap: TrafficSyncParams["trafficMap"] = new Map([
            ["unknown_user", { sent: 1024, received: 2048, requests: 10 }]
        ]);

        const result = await processTrafficLimits({ trafficMap, now: new Date() });

        expect(result.updatedCount).toBe(0);
        expect(result.totalTraffic).toBe(3072);
        expect(mockPrisma.proxyUser.update).not.toHaveBeenCalled();
    });
});

describe("maintenance - processExpiration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("deactivates users with expired subscription", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        mockPrisma.proxyUser.findMany.mockResolvedValue([
            {
                id: 1,
                username: "expired_user",
                isActive: true,
                expiresAt: pastDate,
                telegramUserId: null,
                dataUsed: BigInt(0),
                dataLimit: null
            }
        ]);
        mockPrisma.proxyUser.update.mockResolvedValue({});

        const result = await processExpiration(new Date());

        expect(result.deactivatedCount).toBe(1);
        expect(mockPrisma.proxyUser.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    isActive: false,
                    deactivatedAt: expect.any(Date)
                })
            })
        );
    });

    it("does not deactivate users with future expiration", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        // User with future expiration should NOT be returned by findMany (since findMany uses expiresAt lt: now)
        mockPrisma.proxyUser.findMany.mockResolvedValue([]); // No expired users

        const result = await processExpiration(new Date());

        expect(result.deactivatedCount).toBe(0);
        expect(mockPrisma.proxyUser.update).not.toHaveBeenCalled();
    });
});
