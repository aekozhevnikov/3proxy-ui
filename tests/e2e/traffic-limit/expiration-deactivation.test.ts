/**
 * E2E Test: Expiration Deactivation
 *
 * createProxyUser refuses to create an active user whose expiration has already
 * passed, so we create one with a short future date and wait for it to elapse.
 */
import { PROXYAUTH_CONTAINER_PATH } from "../utils/environment.js";
import { CONTAINER_NAME, execInContainer, removeUserIfExists, UserApiClient } from "./shared-setup.js";

const USERNAME = "expireduser";
const PASSWORD = "ExpiredPass123!";

export async function testExpirationDeactivation(): Promise<void> {
    const users = new UserApiClient();

    await removeUserIfExists(users, USERNAME);

    const expiresAt = new Date(Date.now() + 3000);

    const created = await users.createUser({
        username: USERNAME,
        password: PASSWORD,
        dataLimit: 50,
        isActive: true,
        expiresAt: expiresAt.toISOString()
    });

    if (!created.isActive) {
        throw new Error("User should be active before the expiration date");
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    await users.triggerMaintenance();

    const after = await users.getUser(created.id);
    if (after.isActive) {
        throw new Error("User with expired subscription should be deactivated");
    }
    if (!after.deactivatedAt) {
        throw new Error("deactivatedAt should be set after expiration-based deactivation");
    }

    const proxyauth = await execInContainer(CONTAINER_NAME, `cat ${PROXYAUTH_CONTAINER_PATH}`);
    const hasDeactivatedEntry = proxyauth
        .split("\n")
        .some((line: string) => line.startsWith("# DEACTIVATED") && line.includes(`${USERNAME}:`));

    if (!hasDeactivatedEntry) {
        throw new Error(`Expired user should be commented in .proxyauth, got:\n${proxyauth}`);
    }
}
