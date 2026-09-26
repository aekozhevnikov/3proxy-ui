/**
 * E2E Test: Jail Configuration
 * Verifies the generated jail and the values passed through the environment.
 */
import { execInContainer } from "../utils/helpers.js";
import { CONTAINER_NAME } from "./shared-mocks.js";

const JAIL_PATH = "/etc/fail2ban/jail.d/3proxy-docker.local";
const FILTER_PATH = "/etc/fail2ban/filter.d/3proxy-docker.conf";

/** Values set in tests/e2e/docker-compose.e2e.yml. */
const EXPECTED_MAXRETRY = 2;
const EXPECTED_BANTIME = 30;
const EXPECTED_FINDTIME = 10;

export async function testJailConfiguration(): Promise<void> {
    const jailContent = await execInContainer(CONTAINER_NAME, `cat ${JAIL_PATH}`);

    const expected: [string, string][] = [
        ["[3proxy-docker]", "jail name"],
        ["port = 3128,1080", "monitored ports"],
        ["protocol = tcp", "protocol"],
        ["filter = 3proxy-docker", "filter"],
        ["logpath = /etc/3proxy/logs/3proxy.log", "log path"],
        [`maxretry = ${EXPECTED_MAXRETRY}`, "FAIL2BAN_MAXRETRY"],
        [`bantime = ${EXPECTED_BANTIME}`, "FAIL2BAN_BANTIME"],
        [`findtime = ${EXPECTED_FINDTIME}`, "FAIL2BAN_FINDTIME"],
        ["enabled = true", "enabled flag"]
    ];

    for (const [needle, description] of expected) {
        if (!jailContent.includes(needle)) {
            throw new Error(`Jail ${description} mismatch: expected "${needle}" in:\n${jailContent}`);
        }
    }

    const filterContent = await execInContainer(CONTAINER_NAME, `cat ${FILTER_PATH}`);
    if (!filterContent.includes("[Definition]")) {
        throw new Error(`${FILTER_PATH} should contain [Definition] section`);
    }
}
