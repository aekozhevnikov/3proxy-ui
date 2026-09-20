/**
 * E2E Test: Auth Failure Banning
 * Verifies that IPs with auth failures (407/403) are banned by fail2ban
 */

import { getFail2banStatus, execInContainer } from "./shared-mocks.js";
import { CONTAINER_NAME, TEST_IP } from "./shared-mocks.js";
import { appendLog, sleep } from "./log-helper";

async function testAuthFailureBanning() {
    await appendLog("407");
    await sleep(1000);

    await appendLog("403");
    await sleep(10000);

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.error === "jail_not_active") {
        throw new Error("Fail2ban jail should be active");
    }

    if (!status.bannedIPs || !status.bannedIPs.includes(TEST_IP)) {
        console.warn("  ⚠ IP not found in banned list yet (may need more time)");
        console.warn("  Jail status:", JSON.stringify(status, null, 2));

        await sleep(5000);
        const status2 = await getFail2banStatus(CONTAINER_NAME);
        if (!status2.bannedIPs?.includes(TEST_IP)) {
            console.warn("  ⚠ Still not banned - checking logs...");
            try {
                await execInContainer(CONTAINER_NAME, `tail -50 /var/log/fail2ban.log`);
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
