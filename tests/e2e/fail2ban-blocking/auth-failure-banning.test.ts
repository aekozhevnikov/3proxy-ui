/**
 * E2E Test: Auth Failure Banning
 * Verifies that an IP with failed auth attempts (407/403) ends up both in
 * the fail2ban ban list and in an iptables rule.
 */
import { execInContainer } from "../utils/helpers.js";
import { appendAuthFailure, waitForBan } from "./log-helper.js";
import { CONTAINER_NAME, TEST_IP } from "./shared-mocks.js";

const BANTIME_SECONDS = 30;
const FAILRETRY = 2;

export async function testAuthFailureBanning(): Promise<void> {
    // maxretry = 2, so two failures are enough; write a few for margin
    for (let i = 0; i < FAILRETRY + 1; i++) {
        await appendAuthFailure("407", { username: "banneduser" });
    }

    const { banned, status } = await waitForBan(TEST_IP, 30000);

    if (!banned) {
        const fail2banLog = await execInContainer(CONTAINER_NAME, "tail -30 /var/log/fail2ban.log || true");

        throw new Error(
            `IP ${TEST_IP} was not banned after ${FAILRETRY + 1} auth failures. ` +
                `Jail status: ${JSON.stringify(status)}. fail2ban log:\n${fail2banLog}`
        );
    }

    const iptables = await execInContainer(CONTAINER_NAME, "iptables -L f2b-3proxy-docker -n || true");
    if (!iptables.includes(TEST_IP)) {
        throw new Error(`Expected an iptables rule for ${TEST_IP}, got:\n${iptables}`);
    }

    // The ban must be temporary: the rule is cleared when bantime expires.
    // Check that the jail really is configured with a finite time.
    const jailContent = await execInContainer(CONTAINER_NAME, "cat /etc/fail2ban/jail.d/3proxy-docker.local");
    if (!jailContent.includes(`bantime = ${BANTIME_SECONDS}`)) {
        throw new Error(`Jail should use bantime = ${BANTIME_SECONDS}, got:\n${jailContent}`);
    }
}
