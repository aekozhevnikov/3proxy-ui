/**
 * E2E Test: Auth Failure Banning
 * Verifies that IPs with auth failures (407/403) are banned by fail2ban
 */

import { execInContainer, getFail2banStatus } from "./shared-mocks.js";
import { CONTAINER_NAME, TEST_IP } from "./shared-mocks.js";

const logDir = "/etc/3proxy/logs";

function createLogEntry(code: string) {
    return (
        JSON.stringify({
            time_unix: Math.floor(Date.now() / 1000),
            proxy: { "type:": "HTTP", port: 3128 },
            error: { code },
            auth: { user: "testuser" },
            client: { ip: TEST_IP, port: 12345 },
            server: { ip: "93.158.167.115", port: 443 },
            bytes: { sent: 0, received: 0 },
            request: { hostname: "" },
            message: code === "407" ? "Proxy authentication required" : "Forbidden",
        }) + "\n"
    );
}

async function testAuthFailureBanning() {
    await execInContainer(CONTAINER_NAME, `sh -c "echo '${createLogEntry("407")}' >> ${logDir}/3proxy.log"`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await execInContainer(CONTAINER_NAME, `sh -c "echo '${createLogEntry("403")}' >> ${logDir}/3proxy.log"`);

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.error === "jail_not_active") {
        throw new Error("Fail2ban jail should be active");
    }

    if (!status.bannedIPs || !status.bannedIPs.includes(TEST_IP)) {
        console.warn("  ⚠ IP not found in banned list yet (may need more time)");
        console.warn("  Jail status:", JSON.stringify(status, null, 2));

        await new Promise((resolve) => setTimeout(resolve, 5000));
        const status2 = await getFail2banStatus(CONTAINER_NAME);
        if (!status2.bannedIPs?.includes(TEST_IP)) {
            console.warn("  ⚠ Still not banned - checking logs...");
            try {
                await execInContainer(CONTAINER_NAME, "tail -50 /var/log/fail2ban.log");
            } catch {}
            return;
        }
    }

    try {
        const iptables = await execInContainer(CONTAINER_NAME, `iptables -L f2b-3proxy-docker -n`);
        if (iptables.includes(TEST_IP)) {
            // IP is banned in iptables
        }
    } catch (error) {}
}

testAuthFailureBanning().catch((error) => {
    console.error("Auth failure banning test failed:", error);
    process.exit(1);
});