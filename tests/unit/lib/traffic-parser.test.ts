import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { readTrafficLogs, getUserTraffic, clearTrafficCache, parseTrafficLogs } from "@/src/lib/traffic-parser";
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

const jsonLogEntry = JSON.stringify({
    auth: { user: "testuser" },
    bytes: { sent: 1024, received: 2048 },
});

const jsonLogEntry2 = JSON.stringify({
    auth: { user: "user2" },
    bytes: { sent: 512, received: 1024 },
});

const malformedLine = '192.168.1.100:8080 - - [24/Mar/2026:12:34:56] "CONNECT google.com:443 HTTP/1.1" 200 1234 5678';

describe("parseTrafficLogs", () => {
    it("parses realistic 3proxy JSON log entries", () => {
        const lines = [
            '{"time_unix":1790213392,"proxy":{"type":"ADMIN","port":8088},"auth":{"user":"-"},"bytes":{"sent":0,"received":0},"message":"Accepting connections"}',
            '{"time_unix":1790213400,"proxy":{"type":"PROXY","port":3128},"auth":{"user":"testuser"},"bytes":{"sent":1024,"received":2048},"message":"GET http://google.com/"}',
            '{"time_unix":1790213410,"proxy":{"type":"SOCK5","port":1080},"auth":{"user":"testuser"},"bytes":{"sent":4096,"received":8192},"message":"CONNECT 8.8.4.4:443"}',
            '{"time_unix":1790213420,"proxy":{"type":"PROXY","port":3128},"auth":{"user":"proxyuser1"},"bytes":{"sent":512,"received":256},"message":"GET http://example.com/"}'
        ];

        const result = parseTrafficLogs(lines);

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

        // Total: 5120+10240 + 512+256 + 0+0 = 16128 bytes
        expect(result.totalTraffic).toBe(16128);
    });

    it("includes all users regardless of username value", () => {
        const lines = [
            '{"auth":{"user":"-"},"bytes":{"sent":100,"received":200},"message":"test"}',
            '{"auth":{"user":"realuser"},"bytes":{"sent":1024,"received":2048},"message":"GET"}'
        ];

        const result = parseTrafficLogs(lines);

        // Both users should be included
        expect(result.trafficMap.has("-")).toBe(true);
        expect(result.trafficMap.has("realuser")).toBe(true);
        expect(result.trafficMap.get("-")?.sent).toBe(100);
    });

    it("handles large byte values correctly", () => {
        const lines = [
            '{"auth":{"user":"biguser"},"bytes":{"sent":2147483648,"received":2147483648},"message":"CONNECT"}'
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.get("biguser")).toEqual({
            sent: 2147483648,
            received: 2147483648,
            requests: 1
        });
        expect(result.totalTraffic).toBe(4294967296);
    });

    it("handles text format logs as fallback", () => {
        const lines = [
            '192.168.1.100:8080 - - [24/Mar/2026:12:34:56] "CONNECT google.com:443 HTTP/1.1" 200 1234 5678'
        ];

        const result = parseTrafficLogs(lines);

        expect(result.trafficMap.has("192.168.1.100")).toBe(true);
        expect(result.trafficMap.get("192.168.1.100")?.sent).toBe(1234);
        expect(result.trafficMap.get("192.168.1.100")?.received).toBe(5678);
    });
});

describe("traffic-parser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearTrafficCache();
        mocked(fs.access).mockResolvedValue(undefined);
        (mocked(fs.readdir) as unknown as jest.Mock<Promise<string[]>, [string]>).mockResolvedValue(["test.log"]);
        mocked(fs.readFile).mockResolvedValue(`${jsonLogEntry}\n${jsonLogEntry2}\n${malformedLine}\n`);
    });

    describe("readTrafficLogs", () => {
        it("returns users from JSON log entries", async () => {
            const result = await readTrafficLogs();

            expect(result.has("testuser")).toBe(true);
            expect(result.has("user2")).toBe(true);
        });

        it("aggregates traffic for same username", async () => {
            const result = await readTrafficLogs();

            expect(result.get("testuser")?.totalRequests).toBe(1);
            expect(result.get("testuser")?.totalSent).toBe(1024);
            expect(result.get("testuser")?.totalReceived).toBe(2048);
        });

        it("returns empty map when logs directory doesn't exist", async () => {
            mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

            const result = await readTrafficLogs();

            expect(result.size).toBe(0);
        });

        it("returns cached result on second call", async () => {
            const result1 = await readTrafficLogs();
            const result2 = await readTrafficLogs();

            expect(result1).toBe(result2);
            expect(fs.readFile).toHaveBeenCalledTimes(1);
        });

        it("parses text format logs as fallback", async () => {
            mocked(fs.readFile).mockResolvedValue(malformedLine + "\n");

            const result = await readTrafficLogs();

            expect(result.has("192.168.1.100")).toBe(true);
            expect(result.get("192.168.1.100")?.totalRequests).toBe(1);
            expect(result.get("192.168.1.100")?.totalSent).toBe(1234);
            expect(result.get("192.168.1.100")?.totalReceived).toBe(5678);
        });

        it("handles JSON lines with missing auth.user by using ip", async () => {
            const noUserLog = JSON.stringify({
                auth: {},
                client: { ip: "10.0.0.1" },
                bytes: { sent: 100, received: 200 },
            });
            mocked(fs.readFile).mockResolvedValue(noUserLog + "\n");

            const result = await readTrafficLogs();

            expect(result.has("10.0.0.1")).toBe(true);
        });

        it("skips entries with zero bytes", async () => {
            const zeroBytes = JSON.stringify({
                auth: { user: "zerouser" },
                bytes: { sent: 0, received: 0 },
            });
            mocked(fs.readFile).mockResolvedValue(zeroBytes + "\n");
            const result = await readTrafficLogs();

            expect(result.has("zerouser")).toBe(false);
        });
    });

    describe("getUserTraffic", () => {
        it("returns traffic stats for existing user", async () => {
            const result = await getUserTraffic("testuser");

            expect(result.totalRequests).toBe(1);
            expect(result.totalSent).toBe(1024);
            expect(result.totalReceived).toBe(2048);
        });

        it("returns zero stats for non-existing user", async () => {
            const result = await getUserTraffic("nonexistent");

            expect(result).toEqual({
                totalRequests: 0,
                totalSent: 0,
                totalReceived: 0,
            });
        });
    });

    describe("clearTrafficCache", () => {
        it("clears cache allowing fresh read", async () => {
            await readTrafficLogs();
            expect(fs.readFile).toHaveBeenCalledTimes(1);

            clearTrafficCache();

            await readTrafficLogs();
            expect(fs.readFile).toHaveBeenCalledTimes(2);
        });
    });
});
