/**
 * Integration tests for traffic parsing with BigInt DB handling.
 * Tests the interaction between traffic-parser and ProxyUser dataUsed field.
 */
import { parseTrafficLogs, readTrafficLogs, clearTrafficCache } from "@/src/lib/traffic-parser";
import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { promises as fs } from "fs";

jest.mock("fs", () => ({
    promises: {
        access: jest.fn(),
        readdir: jest.fn(),
        readFile: jest.fn(),
    },
}));

jest.mock("path", () => ({
    ...jest.requireActual("path"),
    join: jest.fn((...args: string[]) => args.join("/")),
    resolve: jest.fn((...args: string[]) => args.join("/")),
}));

describe("Traffic parsing with BigInt compatibility", () => {
    const realisticLogs = [
        JSON.stringify({
            time_unix: 1790213400,
            proxy: { "type:": "PROXY", port: 3128 },
            auth: { user: "testuser" },
            client: { ip: "192.168.1.100", port: 54321 },
            server: { ip: "8.8.8.8", port: 80 },
            bytes: { sent: 1024, received: 2048 },
            request: { hostname: "google.com" },
            message: "GET http://google.com/ HTTP/1.1"
        }),
        JSON.stringify({
            time_unix: 1790213410,
            proxy: { "type:": "SOCK5", port: 1080 },
            auth: { user: "testuser" },
            client: { ip: "192.168.1.100", port: 54322 },
            server: { ip: "8.8.4.4", port: 443 },
            bytes: { sent: 4096, received: 8192 },
            request: { hostname: "8.8.4.4" },
            message: "CONNECT 8.8.4.4:443"
        }),
        JSON.stringify({
            time_unix: 1790213430,
            proxy: { "type:": "SOCKS", port: 1080 },
            auth: { user: "proxyuser2" },
            client: { ip: "10.0.0.51", port: 43211 },
            server: { ip: "1.0.0.1", port: 443 },
            bytes: { sent: 1048576, received: 2097152 },
            request: { hostname: "1.0.0.1" },
            message: "CONNECT 1.0.0.1:443"
        }),
    ];

    it("parseTrafficLogs returns numbers compatible with BigInt conversion", () => {
        const result = parseTrafficLogs(realisticLogs);

        // Verify numbers can be safely converted to BigInt
        const testuserTraffic = result.trafficMap.get("testuser");
        expect(testuserTraffic).toBeDefined();

        // Convert to BigInt as Prisma expects for dataUsed
        const sentBigInt = BigInt(testuserTraffic!.sent);
        const receivedBigInt = BigInt(testuserTraffic!.received);
        const totalBig = BigInt(testuserTraffic!.sent + testuserTraffic!.received);

        expect(typeof sentBigInt).toBe("bigint");
        expect(typeof receivedBigInt).toBe("bigint");
        expect(typeof totalBig).toBe("bigint");

        // Verify precision is maintained
        expect(sentBigInt).toBe(5120n);
        expect(receivedBigInt).toBe(10240n);
        expect(totalBig).toBe(15360n);
    });

    it("parseTrafficLogs totalTraffic can be converted to BigInt", () => {
        const result = parseTrafficLogs(realisticLogs);

        const totalBigInt = BigInt(result.totalTraffic);
        expect(typeof totalBigInt).toBe("bigint");

        // totalTraffic = (1024+2048 + 4096+8192) + (1048576+2097152) = 15360 + 3145728 = 3161088
        expect(totalBigInt).toBe(3161088n);
    });

    it("handles large numbers that exceed 32-bit but fit in BigInt", () => {
        const largeTrafficLog = JSON.stringify({
            time_unix: 1790213500,
            proxy: { "type:": "PROXY", port: 3128 },
            auth: { user: "biguser" },
            client: { ip: "192.168.1.200", port: 54321 },
            server: { ip: "10.0.0.1", port: 443 },
            bytes: { sent: 4294967296, received: 8589934592 }, // 4GB and 8GB
            request: { hostname: "large-download.com" },
            message: "CONNECT large-download.com:443"
        });

        const result = parseTrafficLogs([largeTrafficLog]);

        const bigUserTraffic = result.trafficMap.get("biguser");
        expect(bigUserTraffic).toBeDefined();

        // Verify conversion to BigInt maintains precision
        const sentAsBigInt = BigInt(bigUserTraffic!.sent);
        const receivedAsBigInt = BigInt(bigUserTraffic!.received);

        expect(sentAsBigInt).toBe(BigInt(4294967296));
        expect(receivedAsBigInt).toBe(BigInt(8589934592));
    });

    it("readTrafficLogs aggregated stats can be converted to BigInt for DB storage", async () => {
        clearTrafficCache();
        mocked(fs.access).mockResolvedValue(undefined);
        (mocked(fs.readdir) as unknown as jest.Mock<Promise<string[]>, [string]>).mockResolvedValue(["3proxy.log"]);

        const logContent = realisticLogs.join("\n") + "\n";
        mocked(fs.readFile).mockResolvedValue(logContent);

        const result = await readTrafficLogs();

        // Simulate what happens when storing in DB
        // Prisma expects BigInt for dataUsed field
        for (const [username, stats] of result.entries()) {
            const totalSent = BigInt(stats.totalSent);
            const totalReceived = BigInt(stats.totalReceived);
            const totalRequests = BigInt(stats.totalRequests);

            expect(typeof totalSent).toBe("bigint");
            expect(typeof totalReceived).toBe("bigint");
            expect(typeof totalRequests).toBe("bigint");

            // Verify values are correct
            if (username === "testuser") {
                expect(totalSent).toBe(5120n);
                expect(totalReceived).toBe(10240n);
                expect(totalRequests).toBe(2n);
            } else if (username === "proxyuser2") {
                expect(totalSent).toBe(1048576n);
                expect(totalReceived).toBe(2097152n);
                expect(totalRequests).toBe(1n);
            }
        }
    });

    it("handles empty traffic stats with BigInt conversion", () => {
        const result = parseTrafficLogs([]);

        expect(result.totalTraffic).toBe(0);
        expect(BigInt(result.totalTraffic)).toBe(0n);
    });

    it("aggregates traffic across multiple log entries for same user with BigInt conversion", () => {
        const logLines = [
            JSON.stringify({ auth: { user: "heavyuser" }, bytes: { sent: 1000000, received: 2000000 } }),
            JSON.stringify({ auth: { user: "heavyuser" }, bytes: { sent: 2000000, received: 3000000 } }),
            JSON.stringify({ auth: { user: "heavyuser" }, bytes: { sent: 3000000, received: 4000000 } }),
        ];

        const result = parseTrafficLogs(logLines);

        const heavyUserTraffic = result.trafficMap.get("heavyuser");
        expect(heavyUserTraffic).toBeDefined();

        // Total: sent = 6000000, received = 9000000
        expect(heavyUserTraffic!.sent).toBe(6000000);
        expect(heavyUserTraffic!.received).toBe(9000000);

        // Convert to BigInt and verify
        const totalDataUsed = BigInt(heavyUserTraffic!.sent + heavyUserTraffic!.received);
        expect(totalDataUsed).toBe(15000000n);
    });
});
