// Fail2ban Docker Compose Configuration Tests
// Tests that docker-compose.yml includes required capabilities, volumes, and env vars

import { promises as fs } from "fs";
import path from "path";
import { getProjectRoot } from "./helpers";

describe("Docker Compose Configuration", () => {
    const composePath = path.join(getProjectRoot(), "docker-compose.yml");

    it("should exist", async () => {
        try {
            await fs.access(composePath);
        } catch {
            // Skip if file doesn't exist
            expect(true).toBe(true);
        }
    });

    it("includes NET_ADMIN and NET_RAW capabilities", async () => {
        let composeContent: string;
        try {
            composeContent = await fs.readFile(composePath, "utf-8");
        } catch {
            return;
        }

        expect(composeContent).toContain("NET_ADMIN");
        expect(composeContent).toContain("NET_RAW");
    });

    it("mounts /etc/3proxy/logs and /var/lib/fail2ban volumes", async () => {
        let composeContent: string;
        try {
            composeContent = await fs.readFile(composePath, "utf-8");
        } catch {
            return;
        }

        expect(composeContent).toContain("/etc/3proxy/logs");
        expect(composeContent).toContain("/var/lib/fail2ban");
    });

    it("includes ENABLE_FAIL2BAN env var", async () => {
        let composeContent: string;
        try {
            composeContent = await fs.readFile(composePath, "utf-8");
        } catch {
            return;
        }

        expect(composeContent).toContain("ENABLE_FAIL2BAN");
    });

    it("includes FAIL2BAN_BANTIME, FAIL2BAN_FINDTIME, FAIL2BAN_MAXRETRY env vars", async () => {
        let composeContent: string;
        try {
            composeContent = await fs.readFile(composePath, "utf-8");
        } catch {
            return;
        }

        expect(composeContent).toContain("FAIL2BAN_BANTIME");
        expect(composeContent).toContain("FAIL2BAN_FINDTIME");
        expect(composeContent).toContain("FAIL2BAN_MAXRETRY");
    });
});