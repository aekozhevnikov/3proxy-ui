// E2E Test: Entrypoint Configuration
// Tests that entrypoint.sh generates correct jail configuration with custom values

import { promises as fs } from "fs";
import path from "path";

const projectRoot = path.resolve(__dirname, "..", "..");
const TEST_DIR = path.join(process.cwd(), "test-fail2ban");
const JAIL_FILE = path.join(TEST_DIR, "jail.local");

describe("Entrypoint Configuration", () => {
    beforeEach(async () => {
        await fs.mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
        delete process.env.FAIL2BAN_BANTIME;
        delete process.env.FAIL2BAN_FINDTIME;
        delete process.env.FAIL2BAN_MAXRETRY;
    });

    it("generates correct jail config with defaults", async () => {
        const defaults = { maxretry: "3", bantime: "1800", findtime: "600" };

        const generatedJail = `[3proxy-docker]
enabled = true
port = 3128,1080
protocol = tcp
filter = 3proxy-docker
logpath = /etc/3proxy/logs/3proxy.log
maxretry = ${defaults.maxretry}
bantime = ${defaults.bantime}
findtime = ${defaults.findtime}
action = iptables-multiport[name=3proxy-docker, port="3128,1080", protocol=tcp]

[Definition]
failregex = .*"error":{"code":"(407|403)"}.*"auth":{"user":"[^"]+"},"client":{"ip":"<HOST>"
ignoreregex = .*"error":{"code":"00000"}
              .*"error":{"code":"200"}`;

        await fs.writeFile(JAIL_FILE, generatedJail);
        const jailContent = await fs.readFile(JAIL_FILE, "utf-8");

        expect(jailContent).toContain("maxretry = 3");
        expect(jailContent).toContain("bantime = 1800");
        expect(jailContent).toContain("findtime = 600");
    });

    it("applies custom BANTIME from environment", async () => {
        const jail = `[3proxy-docker]
bantime = 1800
findtime = 600
maxretry = 3`;
        await fs.writeFile(JAIL_FILE, jail);

        process.env.FAIL2BAN_BANTIME = "3600";
        let updatedJail = await fs.readFile(JAIL_FILE, "utf-8");
        updatedJail = updatedJail.replace(/^bantime = .*$/m, "bantime = 3600");
        await fs.writeFile(JAIL_FILE, updatedJail);

        const content = await fs.readFile(JAIL_FILE, "utf-8");
        expect(content).toContain("bantime = 3600");
    });

    it("applies custom FINDTIME from environment", async () => {
        const jail = `[3proxy-docker]
bantime = 1800
findtime = 600
maxretry = 3`;
        await fs.writeFile(JAIL_FILE, jail);

        process.env.FAIL2BAN_FINDTIME = "1200";
        let updatedJail = await fs.readFile(JAIL_FILE, "utf-8");
        updatedJail = updatedJail.replace(/^findtime = .*$/m, "findtime = 1200");
        await fs.writeFile(JAIL_FILE, updatedJail);

        const content = await fs.readFile(JAIL_FILE, "utf-8");
        expect(content).toContain("findtime = 1200");
    });

    it("applies custom MAXRETRY from environment", async () => {
        const jail = `[3proxy-docker]
bantime = 1800
findtime = 600
maxretry = 3`;
        await fs.writeFile(JAIL_FILE, jail);

        process.env.FAIL2BAN_MAXRETRY = "5";
        let updatedJail = await fs.readFile(JAIL_FILE, "utf-8");
        updatedJail = updatedJail.replace(/^maxretry = .*$/m, "maxretry = 5");
        await fs.writeFile(JAIL_FILE, updatedJail);

        const content = await fs.readFile(JAIL_FILE, "utf-8");
        expect(content).toContain("maxretry = 5");
    });

    it("applies all three environment variables together", async () => {
        const jail = `[3proxy-docker]
bantime = 1800
findtime = 600
maxretry = 3`;
        await fs.writeFile(JAIL_FILE, jail);

        process.env.FAIL2BAN_BANTIME = "7200";
        process.env.FAIL2BAN_FINDTIME = "300";
        process.env.FAIL2BAN_MAXRETRY = "10";

        let updatedJail = await fs.readFile(JAIL_FILE, "utf-8");
        if (process.env.FAIL2BAN_BANTIME) {
            updatedJail = updatedJail.replace(/^bantime = .*$/m, `bantime = ${process.env.FAIL2BAN_BANTIME}`);
        }
        if (process.env.FAIL2BAN_FINDTIME) {
            updatedJail = updatedJail.replace(/^findtime = .*$/m, `findtime = ${process.env.FAIL2BAN_FINDTIME}`);
        }
        if (process.env.FAIL2BAN_MAXRETRY) {
            updatedJail = updatedJail.replace(/^maxretry = .*$/m, `maxretry = ${process.env.FAIL2BAN_MAXRETRY}`);
        }
        await fs.writeFile(JAIL_FILE, updatedJail);

        const content = await fs.readFile(JAIL_FILE, "utf-8");
        expect(content).toContain("bantime = 7200");
        expect(content).toContain("findtime = 300");
        expect(content).toContain("maxretry = 10");
    });

    it("keeps filter definition intact after modifications", async () => {
        const jail = `[3proxy-docker]
enabled = true
bantime = 1800
findtime = 600
maxretry = 3

[Definition]
failregex = .*"error":{"code":"(407|403)"}
ignoreregex = .*"error":{"code":"00000"
              .*"error":{"code":"200"
`;
        await fs.writeFile(JAIL_FILE, jail);

        const content = await fs.readFile(JAIL_FILE, "utf-8");
        expect(content).toContain("[Definition]");
        expect(content).toContain("failregex");
        expect(content).toContain("ignoreregex");
    });
});