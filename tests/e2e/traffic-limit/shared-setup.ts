// Shared setup/cleanup for traffic-limit E2E tests
//
// The environment is described in tests/e2e/docker-compose.e2e.yml and is
// driven through utils/environment.ts - this only adapts the suite API.

import {
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    TEST_CONFIG,
    waitForService,
} from "../utils/helpers.js";
import {
    downService,
    resetRuntimeState,
    teardown,
    TRAFFIC_CONTAINER,
    TRAFFIC_SERVICE,
    upService,
} from "../utils/environment.js";
import { UserApiClient } from "../utils/user-api.js";

const CONTAINER_NAME = TRAFFIC_CONTAINER;

/** Brings the traffic stack up and waits for the API and an admin session. */
export async function setupTestEnvironment() {
    await upService(TRAFFIC_SERVICE);

    console.log("Waiting for service to be ready...");
    await waitForService(TEST_CONFIG.apiUrl, 180000);
    console.log("Service is ready!");

    // entrypoint.sh creates the admin (admin/admin) and runs the migrations,
    // so waiting for a successful login is enough.
    await waitForAdminSession();

    await warmUpBackgroundTasks();
}

/**
 * Background tasks, including the maintenance scheduler, start on the first
 * render of the root layout, that is on the first page request. The tests
 * only talk to the API, so the layout never renders and the scheduler stays
 * silently off. A single GET / starts it.
 */
async function warmUpBackgroundTasks(): Promise<void> {
    const deadline = Date.now() + 60000;
    let lastStatus = 0;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${TEST_CONFIG.apiUrl}/`, { signal: AbortSignal.timeout(30000) });

            if (response.ok) {
                // Give cron time to register the task and run the first time.
                await new Promise((resolve) => setTimeout(resolve, 3000));

                return;
            }

            lastStatus = response.status;
        } catch (error) {
            lastStatus = 0;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(
        `Warm-up request to ${TEST_CONFIG.apiUrl}/ never succeeded (last status: ${lastStatus}). ` +
            "Background tasks, including the maintenance scheduler, only start when a page is rendered."
    );
}

/** The admin appears late: /api/auth/login only answers after setup.js. */
async function waitForAdminSession(timeout = 60000): Promise<void> {
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < timeout) {
        try {
            await createAdminSession();

            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }

    throw new Error(
        `Admin session not available after ${timeout}ms: ${
            lastError instanceof Error ? lastError.message : String(lastError)
        }`
    );
}

export async function cleanupTestEnvironment() {
    await downService(TRAFFIC_SERVICE);
    await teardown();
    console.log("Test environment cleaned up");
}

/**
 * Removes the user if it is left over from a previous run: createProxyUser
 * fails on a duplicate name. deleteUser in the API takes an id, not a name.
 */
export async function removeUserIfExists(users: UserApiClient, username: string): Promise<void> {
    const all = await users.listUsers();
    const existing = all.find((user) => user.username === username);

    if (existing) {
        await users.deleteUser(existing.id);
    }
}

export {
    CONTAINER_NAME,
    UserApiClient,
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    resetRuntimeState,
    TEST_CONFIG,
};
