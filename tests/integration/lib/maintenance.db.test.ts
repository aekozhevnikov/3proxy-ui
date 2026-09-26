/**
 * @jest-environment node
 *
 * Integration tests for processTrafficLimits using real SQLite database.
 * These tests verify that traffic data is correctly written to the database
 * with proper BigInt handling.
 */
import { execSync } from "child_process";

// `prisma migrate deploy` in beforeAll takes noticeably longer than the 5s default
jest.setTimeout(30000);

import { existsSync, unlinkSync } from "fs";
import path from "path";

// Set database URL before any imports
const TEST_DB = "/tmp/3proxy-integration-test.db";
process.env.DATABASE_URL = `file:${TEST_DB}`;

// Clean up any existing test database
if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
}

// Force fresh Prisma client with test database
delete require.cache[require.resolve("@/src/prisma/db")];

const { prisma } = require("@/src/prisma/db");
const { processTrafficLimits, processExpiration } = require("@/src/lib/maintenance");

describe("processTrafficLimits and processExpiration integration", () => {
    const testUsername = "testuser";
    const expiredUsername = "expired_user";

    beforeAll(async () => {
        // Run migrations on test database
        execSync("npx prisma migrate deploy", {
            env: {
                ...process.env,
                DATABASE_URL: `file:${TEST_DB}`,
                NODE_ENV: "test"
            },
            stdio: "ignore"
        });

        // Create a test user
        await prisma.user.create({
            data: {
                username: "testadmin",
                password: "hashed",
                name: "Test Admin",
                isAdmin: true
            }
        });

        // Create a proxy user for testing
        await prisma.proxyUser.create({
            data: {
                username: testUsername,
                password: "testpass",
                isActive: true
            }
        });

        // Create expired user
        await prisma.proxyUser.create({
            data: {
                username: expiredUsername,
                password: "testpass",
                isActive: true,
                expiresAt: new Date(Date.now() - 86400000) // Expired yesterday
            }
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.proxyUser.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();

        // Clean up test database
        if (existsSync(TEST_DB)) {
            unlinkSync(TEST_DB);
        }
    });

    beforeEach(async () => {
        // Reset dataUsed before each test
        await prisma.proxyUser.updateMany({
            where: { username: testUsername },
            data: {
                dataUsed: BigInt(0),
                dataLimit: null,
                isActive: true,
                deactivatedAt: null
            }
        });
    });

    describe("processTrafficLimits", () => {
        it("writes traffic data to database as BigInt", async () => {
            const trafficMap = new Map([
                ["testuser", { sent: 1024, received: 2048, requests: 10 }]
            ]);

            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.updatedCount).toBe(1);
            expect(result.totalTraffic).toBe(3072);

            const updatedUser = await prisma.proxyUser.findUnique({
                where: { username: testUsername },
                select: { dataUsed: true }
            });

            expect(updatedUser!.dataUsed).toBe(BigInt(3072));
        });

        it("accumulates traffic correctly across multiple calls", async () => {
            const trafficMap1 = new Map([
                ["testuser", { sent: 100, received: 200, requests: 5 }]
            ]);

            const result1 = await processTrafficLimits({
                trafficMap: trafficMap1,
                now: new Date()
            });

            expect(result1.totalTraffic).toBe(300);

            const trafficMap2 = new Map([
                ["testuser", { sent: 300, received: 400, requests: 5 }]
            ]);

            const result2 = await processTrafficLimits({
                trafficMap: trafficMap2,
                now: new Date()
            });

            expect(result2.totalTraffic).toBe(700);

            const updatedUser = await prisma.proxyUser.findUnique({
                where: { username: testUsername },
                select: { dataUsed: true }
            });

            expect(updatedUser!.dataUsed).toBe(BigInt(1000));
        });

        it("deactivates user when data limit exceeded", async () => {
            // Set data limit to 0 MB = 0 bytes
            await prisma.proxyUser.update({
                where: { username: testUsername },
                data: { dataLimit: BigInt(0) }
            });

            const trafficMap = new Map([
                ["testuser", { sent: 1024, received: 2048, requests: 10 }]
            ]);

            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.deactivatedCount).toBe(1);

            const updatedUser = await prisma.proxyUser.findUnique({
                where: { username: testUsername },
                select: { isActive: true, deactivatedAt: true }
            });

            expect(updatedUser!.isActive).toBe(false);
            expect(updatedUser!.deactivatedAt).toBeInstanceOf(Date);
        });

        it("handles large traffic values without precision loss", async () => {
            const largeValue = 2 ** 53 + 1;
            const trafficMap = new Map([
                ["testuser", { sent: largeValue, received: largeValue, requests: 100 }]
            ]);

            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.totalTraffic).toBe(largeValue * 2);

            const updatedUser = await prisma.proxyUser.findUnique({
                where: { username: testUsername },
                select: { dataUsed: true }
            });

            expect(updatedUser!.dataUsed).toBe(BigInt(largeValue * 2));
        });

        it("preserves precision when the stored value already exceeds 2^53", async () => {
            // Round-tripping the stored value through Number() would round
            // 2^53 + 1 up to 2^53, so the accumulated delta lands one byte short.
            const seed = BigInt("9007199254740993");

            await prisma.proxyUser.update({
                where: { username: testUsername },
                data: { dataUsed: seed }
            });

            const trafficMap = new Map([
                ["testuser", { sent: 3, received: 4, requests: 1 }]
            ]);

            await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            const updatedUser = await prisma.proxyUser.findUnique({
                where: { username: testUsername },
                select: { dataUsed: true }
            });

            expect(updatedUser!.dataUsed).toBe(BigInt("9007199254741000"));
        });

        it("skips users not found in database", async () => {
            const trafficMap = new Map([
                ["nonexistent_user", { sent: 1024, received: 2048, requests: 10 }],
                ["testuser", { sent: 512, received: 256, requests: 5 }]
            ]);

            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.updatedCount).toBe(1);
            expect(result.totalTraffic).toBe(3840);
        });
    });

    describe("processExpiration", () => {
        it("deactivates expired users in database", async () => {
            const result = await processExpiration(new Date());
            expect(result.deactivatedCount).toBe(1);

            const deactivatedUser = await prisma.proxyUser.findUnique({
                where: { username: expiredUsername },
                select: { isActive: true, deactivatedAt: true }
            });

            expect(deactivatedUser!.isActive).toBe(false);
            expect(deactivatedUser!.deactivatedAt).toBeInstanceOf(Date);
        });
    });
});
