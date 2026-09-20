/**
 * @jest-environment node
 */

import { mocked } from "@/tests/unit/test-utils/mock-helpers";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { GET } from "@/src/app/api/system/status/route";
import { type Stats } from "node:fs";

jest.mock("fs", () => {
    const actualFs = jest.requireActual("fs");
    return {
        ...actualFs,
        promises: {
            stat: jest.fn(),
            readFile: jest.fn(),
            readdir: jest.fn(),
            access: jest.fn()
        }
    };
});

jest.mock("child_process", () => ({
    exec: jest.fn()
}));

const mockExec = mocked(exec);

function createMockStats(size: number, mtime: Date): Stats {
    const actualFs = jest.requireActual("fs");
    const stats = new actualFs.Stats();
    stats.size = size;
    stats.mtime = mtime;
    stats.ctime = mtime;
    stats.atime = mtime;
    stats.birthtime = mtime;
    return <Stats>stats;
}

describe("system/status API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockExecFail = () => {
        (mockExec as unknown as jest.Mock).mockImplementation(
            (_cmd: string, _opts: unknown, cb?: (err: Error | null, stdout: string, stderr: string) => void) => {
                if (typeof cb === "function") {
                    cb(new Error("command failed"), "", "");
                }
            }
        );
    };

    it("returns success response with system data", async () => {
        mockExecFail();

        const result = await GET();
        const data = await result.json();

        expect(data.success).toBe(true);
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("config");
        expect(data).toHaveProperty("users");
        expect(data).toHaveProperty("logs");
        expect(data).toHaveProperty("timestamp");
    });

    it("includes isRunning, version, memoryUsage, and pid in status", async () => {
        mockExec.mockImplementation(((
            _cmd: string,
            _opts: unknown,
            cb?: (err: Error | null, stdout: string, stderr: string) => void
        ) => {
            if (typeof cb === "function") {
                cb(new Error("command failed"), "", "");
            }
            return { stdout: "", stderr: "" };
        }) as never);

        const result = await GET();
        const data = await result.json();

        expect(data.status).toHaveProperty("isRunning");
        expect(data.status).toHaveProperty("version");
        expect(data.status).toHaveProperty("memoryUsage");
        expect(data.status).toHaveProperty("pid");
    });

    it("includes config exists and modified in response", async () => {
        mockExecFail();

        const result = await GET();
        const data = await result.json();

        expect(data.config).toHaveProperty("exists");
        expect(data.config).toHaveProperty("modified");
    });

    it("counts non-comment lines in proxyauth as user count", async () => {
        mocked(fs.stat).mockResolvedValue(createMockStats(100, new Date("2025-01-01")));
        mocked(fs.readFile).mockResolvedValue(Buffer.from("user1:pass1:tags\nuser2:pass2:tags\n# comment line\n"));

        mockExecFail();

        const result = await GET();
        const data = await result.json();

        expect(data.users.count).toBe(2);
        expect(data.users.proxyauthSize).toBe(100);
    });

    it("handles exec failure gracefully (3proxy not running)", async () => {
        mockExecFail();

        const result = await GET();
        const data = await result.json();

        expect(data.success).toBe(true);
        expect(data.status.isRunning).toBe(false);
    });
});
