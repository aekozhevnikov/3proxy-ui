// Fail2ban Test Helpers
// Re-exports and shared utilities for fail2ban test suite

import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const projectRoot = path.resolve(__dirname, "..", "..", "..");

export const TEST_DIR = path.join(process.cwd(), "test-fail2ban");
export const LOG_FILE = path.join(TEST_DIR, "3proxy.log");
export const JAIL_FILE = path.join(TEST_DIR, "jail.local");

export const execCommand = async (cmd: string, cwd?: string): Promise<string> => {
    try {
        const { stdout } = await execAsync(cmd, { cwd, maxBuffer: 1024 * 1024 });
        return stdout;
    } catch (error) {
        throw new Error(`Command failed: ${cmd}\n${error instanceof Error ? error.message : String(error)}`);
    }
};

export const getProjectRoot = () => projectRoot;

export const testRegex = /"error":\{"code":"(407|403)"\}.*"auth":\{"user":"[^"]+"\},"client":\{"ip":"([^"]+)"/;

export const generateFilterTestLog = (code: "407" | "403" | "200" | "00000", ip: string, user = "testuser") =>
    JSON.stringify({
        time_unix: Math.floor(Date.now() / 1000),
        proxy: { "type:": "HTTP", port: 3128 },
        error: { code },
        auth: { user },
        client: { ip, port: 12345 },
        server: { ip: "93.158.167.115", port: 443 },
        bytes: { sent: 0, received: 0 },
        request: { hostname: "" },
        message: "",
    }) + "\n";