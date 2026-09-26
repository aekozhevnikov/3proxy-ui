/**
 * @jest-environment node
 */
import { POST } from "@/src/app/api/users/maintenance/route";
import { NextRequest } from "next/server";

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

jest.mock("@/src/core/password-hash", () => ({
    hashProxyPassword: jest.fn((password: string) => `hashed_${password}`)
}));

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn(),
        mkdir: jest.fn(),
        access: jest.fn()
    }
}));

jest.mock("child_process", () => ({
    exec: jest.fn(),
    execCb: jest.fn()
}));

jest.mock("path", () => ({
    join: jest.fn((...args: string[]) => args.join("/")),
    dirname: jest.fn((p: string) => p.split("/").slice(0, -1).join("/"))
}));

// The route reads the log through offsets rather than whole. Log parsing and
// offset handling are covered separately (tests/integration/lib/traffic-sync.test.ts).
jest.mock("@/src/lib/traffic-sync", () => ({
    readSyncState: jest.fn(async () => ({ offsets: {}, existed: true })),
    writeSyncState: jest.fn(async () => undefined),
    seedOffsets: jest.fn(() => ({})),
    identifyLogFile: jest.fn(async () => ({ key: "0:0", size: 0 })),
    readNewLogContent: jest.fn(async (filePath: string) => {
        const content = await require("fs").promises.readFile(filePath, "utf-8");

        return {
            lines: content.split("\n").filter((line: string) => line.trim().length > 0),
            nextOffset: content.length
        };
    })
}));

const prisma = require("@/src/prisma/db").prisma;
const fs = require("fs").promises;

describe("maintenance API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createRequest = (body?: Record<string, unknown>) => {
        return new NextRequest("http://localhost/api/users/maintenance", <RequestInit>{
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
            headers: { "Content-Type": "application/json" }
        });
    };

    afterEach(() => {
        delete process.env.LOGS_DIR;
    });

    it("returns success when no logs directory found", async () => {
        fs.readdir.mockResolvedValue(["3proxy.log"]);
        fs.readFile.mockResolvedValue(
            JSON.stringify({
                auth: { user: "testuser" },
                bytes: { sent: 1024, received: 2048 }
            })
        );
        fs.stat.mockResolvedValue({ mtime: new Date() });
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);
        prisma.proxyUser.findMany.mockResolvedValue([]);

        const result = await POST(createRequest());
        const data = await result.json();

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("processes traffic logs and updates user data usage", async () => {
        const logContent =
            JSON.stringify({
                auth: { user: "testuser" },
                bytes: { sent: 1024, received: 2048 }
            }) + "\n";
        fs.readFile.mockResolvedValueOnce(logContent);
        fs.readdir.mockResolvedValue(["3proxy.log"]);
        fs.stat.mockResolvedValue({ mtime: new Date() });
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);

        const mockUser = {
            id: 1,
            username: "testuser",
            dataUsed: BigInt(0),
            dataLimit: 1000000,
            isActive: true,
            telegramUserId: null,
            password: "hashed"
        };

        prisma.proxyUser.findMany.mockResolvedValue([]);
        prisma.proxyUser.findFirst.mockResolvedValue(mockUser);
        prisma.proxyUser.update.mockResolvedValue({});

        const result = await POST(createRequest({ logsDir: "/test/logs" }));
        const data = await result.json();

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("deactivates user when data limit exceeded", async () => {
        const logContent =
            JSON.stringify({
                auth: { user: "limituser" },
                bytes: { sent: 102400, received: 204800 }
            }) + "\n";
        fs.readFile.mockResolvedValueOnce(logContent);
        fs.readdir.mockResolvedValue(["3proxy.log"]);
        fs.stat.mockResolvedValue({ mtime: new Date() });
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);

        const mockUser = {
            id: 1,
            username: "limituser",
            dataUsed: BigInt(0),
            dataLimit: BigInt(0), // 0 MB limit = 0 bytes, so any traffic exceeds
            isActive: true,
            telegramUserId: null,
            password: "hashed"
        };

        prisma.proxyUser.findMany.mockResolvedValue([]);
        prisma.proxyUser.findFirst.mockResolvedValue(mockUser);
        prisma.proxyUser.update.mockResolvedValue({});

        const result = await POST(createRequest({ logsDir: "/test/logs" }));
        const data = await result.json();

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
        // update is called twice: once for dataUsed, once for deactivation
        expect(prisma.proxyUser.update).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    isActive: false,
                    deactivatedAt: expect.any(Date)
                })
            })
        );
    });

    it("deactivates users with expired subscription", async () => {
        fs.readdir.mockResolvedValue(["3proxy.log"]);
        fs.readFile.mockResolvedValue("");
        fs.stat.mockResolvedValue({ mtime: new Date() });
        fs.mkdir.mockResolvedValue(undefined);
        fs.writeFile.mockResolvedValue(undefined);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        prisma.proxyUser.findMany.mockResolvedValue([
            {
                id: 1,
                username: "expired_user",
                isActive: true,
                expiresAt: pastDate,
                telegramUserId: null
            }
        ]);

        const result = await POST(createRequest({ logsDir: "/test/logs" }));
        const data = await result.json();

        expect(result.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("returns 500 on unexpected error", async () => {
        delete process.env.LOGS_DIR;
        // Mock fs.mkdir to reject to trigger 500 inside updateProxyauthFile
        fs.mkdir.mockRejectedValue(new Error("FS error"));
        fs.readdir.mockRejectedValue(new Error("FS error"));

        const result = await POST(createRequest());
        const data = await result.json();

        expect(result.status).toBe(500);
        expect(data.error).toBe("Maintenance failed");
    });
});
