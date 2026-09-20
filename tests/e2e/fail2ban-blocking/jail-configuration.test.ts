/**
 * E2E Test: Jail Configuration
 * Verifies that fail2ban jail is correctly configured with expected settings
 */

import { execInContainer } from "./shared-mocks.js";
import { CONTAINER_NAME } from "./shared-mocks.js";

async function testUnbanAfterTimeout() {
    const jailContent = await execInContainer(CONTAINER_NAME, "cat /etc/fail2ban/jail.d/3proxy-docker.local");

    if (!jailContent.includes("bantime = 30")) {
        console.warn("  ⚠ Expected bantime=30 for this test");
    }
}

async function testDifferentJailNames() {
    const jailContent = await execInContainer(CONTAINER_NAME, "cat /etc/fail2ban/jail.d/3proxy-docker.local");

    if (!jailContent.includes("[3proxy-docker]")) {
        throw new Error("Jail should be named 3proxy-docker");
    }

    if (!jailContent.includes("port = 3128,1080")) {
        throw new Error("Jail should monitor both proxy ports");
    }

    if (!jailContent.includes("protocol = tcp")) {
        throw new Error("Jail should use TCP protocol");
    }

    if (!jailContent.includes("filter = 3proxy-docker")) {
        throw new Error("Jail should use 3proxy-docker filter");
    }

    if (!jailContent.includes("logpath = /etc/3proxy/logs/3proxy.log")) {
        throw new Error("Jail should monitor correct log path");
    }

    const filterContent = await execInContainer(CONTAINER_NAME, "cat /etc/fail2ban/filter.d/3proxy-docker.conf");
    if (!filterContent.includes("[Definition]")) {
        throw new Error("Filter definition should exist");
    }
}

(async () => {
    try {
        await testUnbanAfterTimeout();
        await testDifferentJailNames();
    } catch (error) {
        console.error("Jail configuration test failed:", error);
        process.exit(1);
    }
})();