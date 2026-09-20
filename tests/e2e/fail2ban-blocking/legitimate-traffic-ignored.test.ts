/**
 * E2E Test: Legitimate Traffic Ignored
 * Verifies that successful responses (200/00000) do NOT trigger fail2ban banning
 */

import { execInContainer, getFail2banStatus } from "./shared-mocks.js";
import { CONTAINER_NAME, LEGIT_IP } from "./shared-mocks.js";

const logDir = "/etc/3proxy/logs";

function createLogEntry(code: string) {
    return (
        JSON.stringify({
            time_unix: Math.floor(Date.now() / 1000),
            proxy: { "type:": "HTTP", port: 3128 },
            error: { code },
            auth: { user: "legituser" },
            client: { ip: LEGIT_IP, port: 12345 },
            server: { ip: "93.158.167.115", port: 443 },
            bytes: { sent: 1024, received: 2048 },
            request: { hostname: "example.com" },
            message: "OK",
        }) + "\n"
    );
}

async function testLegitimateTrafficIgnored() {
    for (let i = 0; i < 5; i++) {
        await execInContainer(CONTAINER_NAME, `sh -c "echo '${createLogEntry("200")}' >> ${logDir}/3proxy.log"`);
        await execInContainer(CONTAINER_NAME, `sh -c "echo '${createLogEntry("00000")}' >> ${logDir}/3proxy.log"`);
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.bannedIPs?.includes(LEGIT_IP)) {
        throw new Error(`Legitimate IP ${LEGIT_IP} should NOT be banned`);
    }
}

testLegitimateTrafficIgnored().catch((error) => {
    console.error("Legitimate traffic ignored test failed:", error);
    process.exit(1);
});