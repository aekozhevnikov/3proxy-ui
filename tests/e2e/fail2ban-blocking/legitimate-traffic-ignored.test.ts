/**
 * E2E Test: Legitimate Traffic Ignored
 * Verifies that successful responses (200/00000) do NOT trigger fail2ban banning
 */

import { getFail2banStatus } from "./shared-mocks.js";
import { CONTAINER_NAME, LEGIT_IP } from "./shared-mocks.js";
import { appendLog, sleep } from "./log-helper.ts";

async function testLegitimateTrafficIgnored() {
    for (let i = 0; i < 5; i++) {
        await appendLog("200", { ip: LEGIT_IP, username: "legituser", bytesSent: 1024, bytesReceived: 2048, message: "OK" });
        await appendLog("00000", { ip: LEGIT_IP, username: "legituser", bytesSent: 1024, bytesReceived: 2048, message: "OK" });
        await sleep(500);
    }

    await sleep(5000);

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.bannedIPs?.includes(LEGIT_IP)) {
        throw new Error(`Legitimate IP ${LEGIT_IP} should NOT be banned`);
    }
}

testLegitimateTrafficIgnored().catch((error) => {
    console.error("Legitimate traffic ignored test failed:", error);
    process.exit(1);
});