// Shared setup/cleanup for fail2ban-blocking E2E tests
//
// Окружение описано в tests/e2e/docker-compose.e2e.yml (сервис
// 3proxy-ui-e2e-fail2ban), управляется через utils/environment.ts.

import { getFail2banStatus, TEST_CONFIG, waitForService } from "../utils/helpers.js";
import {
    downService,
    FAIL2BAN_CONTAINER,
    FAIL2BAN_SERVICE,
    teardown,
    upService,
} from "../utils/environment.js";

const CONTAINER_NAME = FAIL2BAN_CONTAINER;

/** IP, который должен попасть в бан за неудачные попытки авторизации. */
const TEST_IP = "192.168.99.100";
/** IP, который не должен баниться при успешном трафике. */
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
