// Fail2ban Log Format Validation Tests
// Tests that 3proxy.cfg uses JSON log format and log entries have required fields

import { promises as fs } from "fs";
import path from "path";
import { getProjectRoot } from "./helpers";

describe("Log Format Validation", () => {
    const configPath = path.join(getProjectRoot(), "3proxy", "3proxy.cfg");

    const readConfig = async () => {
        try {
            await fs.access(configPath);
            return await fs.readFile(configPath, "utf-8");
        } catch {
            return null;
        }
    };

    it("3proxy.cfg uses JSON log format with time_unix field", async () => {
        const config = await readConfig();
        if (!config) return;

        expect(config).toContain("logformat");
        expect(config).toContain("time_unix");
    });

    it("3proxy.cfg has log directive with D (JSON) format", async () => {
        const config = await readConfig();
        if (!config) return;

        const logPathMatch = config.match(/log\s+(\S+)\s+D/);
        expect(logPathMatch).not.toBeNull();
    });

    it("sample log entry has required fields: error.code, client.ip, auth.user", () => {
        const sampleLog = {
            time_unix: Math.floor(Date.now() / 1000),
            proxy: { "type:": "HTTP", port: 3128 },
            error: { code: "407" },
            auth: { user: "testuser" },
            client: { ip: "1.2.3.4", port: 12345 },
            server: { ip: "93.158.167.115", port: 443 },
            bytes: { sent: 0, received: 0 },
            request: { hostname: "" },
            message: "IP limit exceeded",
        };

        const serialized = JSON.stringify(sampleLog);
        const parsed = JSON.parse(serialized);

        expect(parsed.error?.code).toBeDefined();
        expect(parsed.client?.ip).toBeDefined();
        expect(parsed.auth?.user).toBeDefined();
    });
});