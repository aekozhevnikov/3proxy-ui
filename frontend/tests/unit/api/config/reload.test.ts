import { mocked } from '@/tests/unit/test-utils/mock-helpers';
/**
 * @jest-environment node
 */

import { POST } from "@/src/app/api/config/reload/route";

jest.mock("@/src/core/auth", () => ({
    requireAdmin: jest.fn(async () => ({ user: { id: 1, username: "admin" }, denial: null }))
}));

jest.mock("child_process", () => ({
    exec: jest.fn(),
}));

import { exec } from "child_process";
const execCb = mocked(exec);

describe("config/reload API", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("restarts container when found", async () => {
        execCb.mockImplementation(((cmd, options, callback) => {
            if (cmd.includes("docker ps")) {
                callback(null, "container123\n", "");
            } else if (cmd.includes("docker restart")) {
                callback(null, "Container restarted", "");
            } else {
                callback(null, "", "");
            }
        }) as any);

        const result = await POST();
        const data = await result.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe("Configuration reloaded and container restarted");
    });

    it("returns success with no container message when no container found", async () => {
        execCb.mockImplementation(((cmd, options, callback) => {
            if (cmd.includes("docker ps")) {
                callback(null, "", "");
            } else {
                callback(null, "", "");
            }
        }) as any);

        const result = await POST();
        const data = await result.json();

        expect(data.success).toBe(true);
        expect(data.message).toBe("Configuration updated (no container to restart)");
    });

    it("returns 500 on error", async () => {
        execCb.mockImplementation(((cmd: string, _options: unknown, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
            if (cmd.includes("docker ps")) {
                callback(null, "container123\n", "");
            } else if (cmd.includes("docker restart")) {
                callback(new Error("Docker error"), "", "error output");
            } else {
                callback(null, "", "");
            }
        }) as any);

        const result = await POST();
        const data = await result.json();

        expect(result.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.message).toBe("Failed to reload configuration");
    });
});
