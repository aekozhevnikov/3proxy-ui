// Shared setup/cleanup for fail2ban-blocking E2E tests
//
// The environment is described in tests/e2e/docker-compose.e2e.yml (service
// 3proxy-ui-e2e-fail2ban) and is driven through utils/environment.ts.

import { getFail2banStatus, TEST_CONFIG, waitForService } from "../utils/helpers.js";
import {
    downService,
    FAIL2BAN_CONTAINER,
    FAIL2BAN_SERVICE,
    teardown,
    upService,
} from "../utils/environment.js";

const CONTAINER_NAME = FAIL2BAN_CONTAINER;

/** IP that must be banned after failed authentication attempts. */
const TEST_IP = "192.168.99.100";
/** IP that must not be banned on successful traffic. */
const LEGIT_IP = "192.168.99.101";

export async function setupEnvironment() {
    await upService(FAIL2BAN_SERVICE);

    await waitForService(TEST_CONFIG.apiUrl, 180000);

    const status = await getFail2banStatus(CONTAINER_NAME);
    if (status.error === "jail_not_active") {
        throw new Error("Fail2ban jail should be active");
    }
}

export async function cleanup() {
    await downService(FAIL2BAN_SERVICE);
    await teardown();
    console.log("Test environment cleaned up");
}

export { CONTAINER_NAME, TEST_IP, LEGIT_IP, getFail2banStatus };
