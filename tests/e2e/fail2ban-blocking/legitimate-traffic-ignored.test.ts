/**
 * E2E Test: Legitimate Traffic Ignored
 * Successful requests (code 00000) must not lead to an IP ban.
 */
import { getFail2banStatus } from "../utils/helpers.js";
import { appendSuccess, sleep } from "./log-helper.js";
import { CONTAINER_NAME, LEGIT_IP } from "./shared-mocks.js";

const REQUESTS = 5;

export async function testLegitimateTrafficIgnored(): Promise<void> {
    // Well above maxretry requests, otherwise the check proves nothing.
    for (let i = 0; i < REQUESTS; i++) {
        await appendSuccess();
        await sleep(300);
    }

    // Give fail2ban time to read the log and update the ban list.
    await sleep(10000);

    const status = await getFail2banStatus(CONTAINER_NAME);

    if (status.bannedIPs?.includes(LEGIT_IP)) {
        throw new Error(`Legitimate IP ${LEGIT_IP} should NOT be banned. Status: ${JSON.stringify(status)}`);
    }
}
