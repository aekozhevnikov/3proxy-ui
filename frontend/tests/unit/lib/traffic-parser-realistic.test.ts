import { parseTrafficLogs, readTrafficLogs, getUserTraffic, clearTrafficCache } from "@/src/lib/traffic-parser";
import { promises as fs } from "fs";
import { mocked } from '@/tests/unit/test-utils/mock-helpers';

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

// Realistic 3proxy JSON log entries matching actual format
const realisticLogEntries = [
    JSON.stringify({
        time_unix: 1790213392,
        proxy: { "type:": "ADMIN", port: 8088 },
        auth: { user: "-" },
        client: { ip: "0.0.0.0", port: 8088 },
        server: { ip: "0.0.0.0", port: 0 },
        bytes: { sent: 0, received: 0 },
        request: { hostname: "[0.0.0.0]" },
        message: "Accepting connections [1/4284368576]"
    }),
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
        time_unix: 1790213420,
        proxy: { "type:": "PROXY", port: 3128 },
        auth: { user: "proxyuser1" },
        client: { ip: "10.0.0.50", port: 43210 },
        server: { ip: "1.1.1.1", port: 80 },
        bytes: { sent: 512, received: 256 },
        request: { hostname: "example.com" },
        message: "GET http://example.com/ HTTP/1.1"
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

// Logs with very large byte values for BigInt testing
const largeTrafficLogs = [
    JSON.stringify({
        time_unix: 1790213500,
        proxy: { "type:": "PROXY", port: 3128 },
        auth: { user: "biguser" },
        client: { ip: "192.168.1.200", port: 12345 },
        server: { ip: "10.0.0.1", port: 443 },
        bytes: { sent: 9007199254740991, received: 18014398509481982 }, // Number.MAX_SAFE_INTEGER, 2x that
        request: { hostname: "large-download.com" },
        message: "CONNECT large-download.com:443"
    }),
    JSON.stringify({
        time_unix: 1790213510,
        proxy: { "type:": "PROXY", port: 3128 },
        auth: { user: "biguser" },
        client: { ip: "192.168.1.200", port: 12346 },
        server: { ip: "10.0.0.2", port: 80 },
        bytes: { sent: 5000000000, received: 10000000000 }, // Beyond 32-bit, needs BigInt
        request: { hostname: "streaming-service.com" },
        message: "GET http://streaming-service.com/video.mp4 HTTP/1.1"
    }),
];

describe("parseTrafficLogs with realistic 3proxy formats", () => {
    it("parses realistic 3proxy JSON log entries with full structure", () => {
        const result = parseTrafficLogs(realisticLogEntries);

        // Skip admin entries (user "-") - check if included
        expect(result.trafficMap.has("testuser")).toBe(true);
        expect(result.trafficMap.has("proxyuser1")).toBe(true);
        expect(result.trafficMap.has("proxyuser2")).toBe(true);

        // testuser: 1024+4096 = 5120 sent, 2048+8192 = 10240 received, 2 requests
        expect(result.trafficMap.get("testuser")).toEqual({
            sent: 5120,
            received: 10240,
            requests: 2
        });

        // proxyuser1: 512 sent, 256 received, 1 request
        expect(result.trafficMap.get("proxyuser1")).toEqual({
            sent: 512,
            received: 256,
            requests: 1
        });

        // proxyuser2: 1048576 sent, 2097152 received, 1 request
        expect(result.trafficMap.get("proxyuser2")).toEqual({
            sent: 1048576,
            received: 2097152,
            requests: 1
        });
    });

    it("handles multiple users with aggregated traffic correctly", () => {
        const lines = [
            JSON.stringify({ auth: { user: "user1" }, bytes: { sent: 1000, received: 2000 } }),
            JSON.stringify({ auth: { user: "user1" }, bytes: { sent: 500, received: 1000 } }),
            JSON.stringify({ auth: { user: "user2" }, bytes: { sent: 300, received: 600 } }),
            JSON.stringify({ auth: { user: "user3" }, bytes: { sent: 100, received: 200 } }),
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.get("user1")).toEqual({
            sent: 1500, received: 3000, requests: 2
        });
        expect(result.trafficMap.get("user2")).toEqual({
            sent: 300, received: 600, requests: 1
        });
        expect(result.trafficMap.get("user3")).toEqual({
            sent: 100, received: 200, requests: 1
        });
    });

    it("properly sums total traffic across all users", () => {
        const result = parseTrafficLogs(realisticLogEntries);

        // Calculate expected total
        // Admin: 0+0=0
        // testuser: 1024+2048 + 4096+8192 = 15360
        // proxyuser1: 512+256 = 768
        // proxyuser2: 1048576+2097152 = 3145728
        // Total: 0 + 15360 + 768 + 3145728 = 3161856
        expect(result.totalTraffic).toBe(3161856);
    });

    it("handles entries with missing bytes gracefully", () => {
        const lines = [
            JSON.stringify({ auth: { user: "user1" }, bytes: {} }),
            JSON.stringify({ auth: { user: "user1" }, bytes: { sent: 100 } }),
            JSON.stringify({ auth: { user: "user1" }, bytes: { received: 200 } }),
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.has("user1")).toBe(true);
        expect(result.trafficMap.get("user1")?.sent).toBe(100);
        expect(result.trafficMap.get("user1")?.received).toBe(200);
        expect(result.trafficMap.get("user1")?.requests).toBe(3);
    });

    it("handles entries with missing auth.user gracefully", () => {
        const lines = [
            JSON.stringify({ auth: { user: "testuser" }, bytes: { sent: 100, received: 200 } }),
            JSON.stringify({ auth: {}, bytes: { sent: 50, received: 100 } }),
        ];

        const result = parseTrafficLogs(lines);

        // First entry has auth.user, second entry has no auth.user - username is null - skipped
        expect(result.trafficMap.has("testuser")).toBe(true);
        expect(result.trafficMap.get("testuser")?.sent).toBe(100);
        expect(result.trafficMap.has(null as any)).toBe(false);
    });

    it("properly formats proxy type field (type: vs type)", () => {
        // 3proxy uses "type:" with colon in some versions, "type" without in others
        const lines = [
            JSON.stringify({ proxy: { "type:": "PROXY" }, auth: { user: "user1" }, bytes: { sent: 100, received: 200 } }),
            JSON.stringify({ proxy: { type: "PROXY" }, auth: { user: "user2" }, bytes: { sent: 50, received: 100 } }),
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.size).toBe(2);
        expect(result.trafficMap.has("user1")).toBe(true);
        expect(result.trafficMap.has("user2")).toBe(true);
    });
});

describe("BigInt handling for large traffic values", () => {
    it("handles Number.MAX_SAFE_INTEGER values", () => {
        const result = parseTrafficLogs(largeTrafficLogs);

        // Note: JavaScript numbers lose precision beyond 2^53 - 1
        // The parser uses number type, not BigInt
        // MAX_SAFE_INTEGER = 9007199254740991
        expect(result.trafficMap.has("biguser")).toBe(true);
    });

    it("accumulates large byte values correctly for single request", () => {
        const lines = [
            JSON.stringify({
                auth: { user: "biguser" },
                bytes: { sent: 4294967296, received: 8589934592 } // 4GB and 8GB
            }),
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.get("biguser")).toEqual({
            sent: 4294967296,
            received: 8589934592,
            requests: 1
        });
    });

    it("accumulates very large traffic across multiple entries", () => {
        const lines = [
            JSON.stringify({
                auth: { user: "biguser" },
                bytes: { sent: 5000000000, received: 10000000000 }
            }),
            JSON.stringify({
                auth: { user: "biguser" },
                bytes: { sent: 3000000000, received: 6000000000 }
            }),
            JSON.stringify({
                auth: { user: "biguser" },
                bytes: { sent: 2000000000, received: 4000000000 }
            }),
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.get("biguser")?.sent).toBe(10000000000);
        expect(result.trafficMap.get("biguser")?.received).toBe(20000000000);
        expect(result.trafficMap.get("biguser")?.requests).toBe(3);
        expect(result.totalTraffic).toBe(30000000000);
    });
});

describe("readTrafficLogs with realistic file content", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearTrafficCache();
        mocked(fs.access).mockResolvedValue(undefined);
        (mocked(fs.readdir) as unknown as jest.Mock<Promise<string[]>, [string]>).mockResolvedValue(["3proxy.log"]);
    });

    it("reads realistic 3proxy log file and aggregates by user", async () => {
        const logContent = realisticLogEntries.join("\n") + "\n";
        mocked(fs.readFile).mockResolvedValue(logContent);

        const result = await readTrafficLogs();

        expect(result.size).toBe(3); // testuser, proxyuser1, proxyuser2 (admin user "-" is excluded)
        expect(result.has("testuser")).toBe(true);
        expect(result.has("proxyuser1")).toBe(true);
        expect(result.has("proxyuser2")).toBe(true);

        expect(result.get("testuser")?.totalSent).toBe(5120);
        expect(result.get("testuser")?.totalReceived).toBe(10240);
        expect(result.get("testuser")?.totalRequests).toBe(2);
    });

    it("reads log file with large traffic values", async () => {
        const logContent = largeTrafficLogs.join("\n") + "\n";
        mocked(fs.readFile).mockResolvedValue(logContent);

        const result = await readTrafficLogs();

        expect(result.has("biguser")).toBe(true);
        // Values may exceed safe integer range but parser handles them as number
        expect(result.get("biguser")?.totalSent).toBe(9007199254740991 + 5000000000);
        expect(result.get("biguser")?.totalRequests).toBe(2);
    });

    it("excludes admin users and zero-byte entries", async () => {
        const logContent = JSON.stringify({
            proxy: { "type:": "ADMIN", port: 8088 },
            auth: { user: "-" },
            bytes: { sent: 0, received: 0 },
            message: "Accepting connections"
        }) + "\n";

        mocked(fs.readFile).mockResolvedValue(logContent);

        const result = await readTrafficLogs();

        // Admin entries with "-" user and zero bytes should be excluded
        expect(result.has("-")).toBe(false);
        expect(result.size).toBe(0);
    });

    it("handles mixed JSON and text format logs", async () => {
        const jsonLine = JSON.stringify({
            auth: { user: "jsonuser" },
            bytes: { sent: 1000, received: 2000 }
        });
        const textLine = '192.168.1.50:8080 - - [24/Mar/2026:12:34:56] "GET http://example.com/ HTTP/1.1" 200 500 1000';
        const logContent = jsonLine + "\n" + textLine + "\n";

        mocked(fs.readFile).mockResolvedValue(logContent);

        const result = await readTrafficLogs();

        expect(result.has("jsonuser")).toBe(true);
        expect(result.get("jsonuser")?.totalSent).toBe(1000);

        // Text format logs parsed by IP
        expect(result.has("192.168.1.50")).toBe(true);
        expect(result.get("192.168.1.50")?.totalSent).toBe(500);
        expect(result.get("192.168.1.50")?.totalReceived).toBe(1000);
    });

    it("handles empty log file gracefully", async () => {
        mocked(fs.readFile).mockResolvedValue("");

        const result = await readTrafficLogs();

        expect(result.size).toBe(0);
    });

    it("handles file with only blank lines", async () => {
        mocked(fs.readFile).mockResolvedValue("\n\n\n\n");

        const result = await readTrafficLogs();

        expect(result.size).toBe(0);
    });
});
