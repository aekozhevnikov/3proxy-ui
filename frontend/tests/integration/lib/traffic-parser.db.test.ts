/**
 * @jest-environment node
 *
 * Integration tests for traffic parsing with real log files and database.
 * Uses test fixtures from tests/e2e/test-fixtures/logs/.
 */
import { execSync } from "child_process";

// `prisma migrate deploy` in beforeAll takes noticeably longer than the 5s default
jest.setTimeout(30000);

import { existsSync, unlinkSync, readFileSync, readdirSync } from "fs";
import path from "path";

// Set database URL before any imports
const TEST_DB = "/tmp/3proxy-integration-traffic-test.db";
const TEST_LOGS_DIR = path.resolve(__dirname, "../../e2e/test-fixtures/logs");
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.LOGS_DIR = TEST_LOGS_DIR;

// Clean up any existing test database
if (existsSync(TEST_DB)) {
    unlinkSync(TEST_DB);
}

// Force fresh Prisma client with test database
delete require.cache[require.resolve("@/src/prisma/db")];
delete require.cache[require.resolve("@/src/lib/traffic-parser")];
delete require.cache[require.resolve("@/src/lib/maintenance")];

const { prisma } = require("@/src/prisma/db");
const { parseTrafficLogs, readTrafficLogs, clearTrafficCache } = require("@/src/lib/traffic-parser");
const { processTrafficLimits } = require("@/src/lib/maintenance");

// 3proxy rotates daily: current log plus 3proxy.log.YYYY.MM.DD archives
function readAllFixtureLines(): string[] {
    return readdirSync(TEST_LOGS_DIR)
        .filter((file) => file.startsWith("3proxy.log") || file.endsWith(".log"))
        .flatMap((file) => readFileSync(path.join(TEST_LOGS_DIR, file), "utf-8").split("\n"));
}

describe("traffic-parser integration with real logs", () => {
    const testUsernames = ["testuser", "proxyuser1", "proxyuser2"];

    beforeAll(async () => {
        // Run migrations
        execSync("npx prisma migrate deploy", {
            env: {
                ...process.env,
                DATABASE_URL: `file:${TEST_DB}`,
                NODE_ENV: "test"
            },
            stdio: "ignore"
        });

        // Create test users
        await prisma.user.create({
            data: { username: "admin", password: "hash", name: "Admin", isAdmin: true }
        });

        for (const username of testUsernames) {
            await prisma.proxyUser.create({
                data: {
                    username,
                    password: "testpass",
                    isActive: true,
                    dataUsed: BigInt(0)
                }
            });
        }
    });

    afterAll(async () => {
        await prisma.$executeRawUnsafe("DELETE FROM ProxyUser WHERE username IN ('admin','testuser','proxyuser1','proxyuser2');");
        await prisma.$executeRawUnsafe("DELETE FROM User WHERE username = 'admin';");
        await prisma.$disconnect();
        if (existsSync(TEST_DB)) {
            unlinkSync(TEST_DB);
        }
    });

    beforeEach(async () => {
        await prisma.proxyUser.updateMany({
            where: { username: { in: testUsernames } },
            data: {
                dataUsed: BigInt(0),
                dataLimit: null,
                isActive: true,
                deactivatedAt: null
            }
        });
        clearTrafficCache();
    });

    describe("readTrafficLogs with real log files", () => {
        it("reads both the current and the rotated daily log", async () => {
            const statsMap = await readTrafficLogs();

            // testuser: 4 entries in the rotated log + 1 in the current log
            const testUserStats = statsMap.get("testuser");
            expect(testUserStats).toBeDefined();
            expect(testUserStats!.totalSent).toBe(1024 + 4096 + 100 + 2000000 + 150000);
            expect(testUserStats!.totalReceived).toBe(2048 + 8192 + 200 + 3000000 + 450000);
            expect(testUserStats!.totalRequests).toBe(5);
        });

        it("correctly identifies all users across rotated and current logs", async () => {
            const statsMap = await readTrafficLogs();

            expect(statsMap.has("testuser")).toBe(true);
            expect(statsMap.has("proxyuser1")).toBe(true);
            expect(statsMap.has("proxyuser2")).toBe(true);
            // unknownuser exists only in the rotated log
            expect(statsMap.has("unknownuser")).toBe(true);

            // Zero-byte entries are filtered out
            expect(statsMap.has("-")).toBe(false);
            expect(statsMap.has("unauthorized")).toBe(false);
        });

        it("parses the traditional text format keyed by client IP", async () => {
            const statsMap = await readTrafficLogs();

            expect(statsMap.get("203.0.113.10")).toEqual({
                totalRequests: 1,
                totalSent: 1500,
                totalReceived: 3000
            });
            expect(statsMap.get("203.0.113.11")).toEqual({
                totalRequests: 1,
                totalSent: 700,
                totalReceived: 1400
            });
        });

        it("ignores malformed lines instead of failing", async () => {
            const statsMap = await readTrafficLogs();

            // The fixture contains a truncated JSON line
            expect(statsMap.size).toBe(6);
        });
    });

    describe("parseTrafficLogs with real log files", () => {
        it("aggregates all fixture files per user", () => {
            const { trafficMap } = parseTrafficLogs(readAllFixtureLines());

            expect(trafficMap.get("testuser")).toEqual({
                sent: 2155220,
                received: 3460440,
                // 5 traffic entries plus one 407 auth failure with zero bytes
                requests: 6
            });

            expect(trafficMap.get("proxyuser1")).toEqual({
                sent: 252560,
                received: 504352,
                requests: 3
            });

            expect(trafficMap.get("proxyuser2")).toEqual({
                sent: 1581056,
                received: 3162112,
                requests: 3
            });
        });

        it("computes the total traffic across every entry", () => {
            const { totalTraffic } = parseTrafficLogs(readAllFixtureLines());

            expect(totalTraffic).toBe(11122490);
        });

        it("parses only the current log when a single file is supplied", () => {
            const currentLines = readFileSync(path.join(TEST_LOGS_DIR, "3proxy.log"), "utf-8").split("\n");
            const { trafficMap } = parseTrafficLogs(currentLines);

            expect(trafficMap.get("testuser")).toEqual({
                sent: 150000,
                received: 450000,
                requests: 1
            });
            expect(trafficMap.has("unknownuser")).toBe(false);
        });
    });

    describe("processTrafficLimits with real data", () => {
        it("writes correct traffic data to database as BigInt", async () => {
            const { trafficMap } = parseTrafficLogs(readAllFixtureLines());

            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.updatedCount).toBe(testUsernames.length);

            const testUser = await prisma.proxyUser.findUnique({
                where: { username: "testuser" },
                select: { dataUsed: true }
            });

            expect(testUser).toBeTruthy();
            expect(typeof testUser!.dataUsed).toBe("bigint");
            expect(testUser!.dataUsed).toBe(BigInt(2155220 + 3460440));
        });

        it("writes exact values for every user with traffic", async () => {
            const { trafficMap } = parseTrafficLogs(readAllFixtureLines());

            await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            const users = await prisma.proxyUser.findMany({
                where: { username: { in: testUsernames } },
                select: { username: true, dataUsed: true }
            });

            const used = new Map(users.map((u: { username: string; dataUsed: bigint }) => [u.username, u.dataUsed]));

            expect(used.get("testuser")).toBe(BigInt(5615660));
            expect(used.get("proxyuser1")).toBe(BigInt(756912));
            expect(used.get("proxyuser2")).toBe(BigInt(4743168));
        });

        it("handles users not present in database gracefully", async () => {
            const { trafficMap } = parseTrafficLogs(readAllFixtureLines());

            // Fixture contains unknownuser, the admin placeholder "-" and a 407 "unauthorized" user
            const result = await processTrafficLimits({
                trafficMap,
                now: new Date()
            });

            expect(result.updatedCount).toBe(testUsernames.length);
            expect(result.totalTraffic).toBe(11122490);
        });
    });
});
