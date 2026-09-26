/**
 * E2E Test: Fail2ban Regex Pattern Validation
 * Verifies that the fail2ban filter in the image matches the 3proxy log format.
 */
import { execInContainer } from "../utils/helpers.js";
import { CONTAINER_NAME } from "./shared-mocks.js";

const FILTER_PATH = "/etc/fail2ban/filter.d/3proxy-docker.conf";

export async function testFail2banRegex(): Promise<void> {
    const filterContent = await execInContainer(CONTAINER_NAME, `cat ${FILTER_PATH}`);

    if (!filterContent.includes("[Definition]")) {
        throw new Error(`${FILTER_PATH} should contain [Definition] section`);
    }

    if (
        !filterContent.includes("failregex") ||
        !filterContent.includes("(407|403)") ||
        !filterContent.includes("<HOST>")
    ) {
        throw new Error(`${FILTER_PATH} should have a failregex matching 407/403 with <HOST>`);
    }

    if (
        !filterContent.includes("ignoreregex") ||
        !filterContent.includes('"code":"00000"') ||
        !filterContent.includes('"code":"200"')
    ) {
        throw new Error(`${FILTER_PATH} should ignore successful responses (00000/200)`);
    }
}
