/**
 * E2E Test: Expiration Deactivation
 *
 * createProxyUser refuses to create an active user whose expiration has already
 * passed, so we create one with a short future date and wait for it to elapse.
 *
 * The point of the test is the last step. Deactivating a user used to mean
 * writing a "# DEACTIVATED <date>: user:CR:"..." line into the file 3proxy
 * reads, and that is not a comment there: 3proxy only skips a # line in
 * readconfig(), for top-level config, while a file pulled in by the $ directive
 * is parsed by a recursive parsestr() that has no # case at all. The user was
 * therefore still registered and could still authenticate after the panel had
 * already shown them as deactivated.
 */
import { PROXYAUTH_CONTAINER_PATH } from "../utils/environment.js";
import { execAsync } from "../utils/helpers.js";
import { CONTAINER_NAME, execInContainer, removeUserIfExists, UserApiClient } from "./shared-setup.js";

const USERNAME = "expireduser";
const PASSWORD = "ExpiredPass123!";

/**
 * Polls until the proxy answers with `expected`, because maintenance restarts
 * 3proxy and a fixed sleep races the restart. Returns the last status seen.
 */
async function waitForProxyStatus(
    user: string,
    password: string,
    expected: number,
    timeoutMs = 30000
): Promise<number> {
    const deadline = Date.now() + timeoutMs;
    let last = 0;

    while (Date.now() < deadline) {
        last = await proxyStatusFor(user, password);

        if (last === expected) {
            return last;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return last;
}

/** 3proxy answers an unauthenticated request to a protected service with 407. */
async function proxyStatusFor(user: string, password: string): Promise<number> {
    const url = `http://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:3128/`;

    try {
        const { stdout } = await execAsync(
            `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 10 -x ${url} http://example.com`
        );

        return Number.parseInt(stdout.trim(), 10);
    } catch {
        return 0;
    }
}

export async function testExpirationDeactivation(): Promise<void> {
    const users = new UserApiClient();

    await removeUserIfExists(users, USERNAME);

    // Long enough that the active check below can observe the account working
    // before it lapses, including a 3proxy restart in the middle.
    const expiresAt = new Date(Date.now() + 20000);

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

    // While active, the credentials must actually work, otherwise the check
    // below would pass for the wrong reason. Maintenance rewrites the users file
    // and restarts 3proxy, so allow it to come back up before probing.
    await users.triggerMaintenance();

    const beforeStatus = await waitForProxyStatus(USERNAME, PASSWORD, 200, 8000);

    if (beforeStatus === 407) {
        throw new Error(
            `A user that is still active should be able to authenticate through 3proxy, got ${beforeStatus}`
        );
    }

    await new Promise((resolve) => setTimeout(resolve, Math.max(0, expiresAt.getTime() - Date.now()) + 1000));

    await users.triggerMaintenance();

    const after = await users.getUser(created.id);
    if (after.isActive) {
        throw new Error("User with expired subscription should be deactivated");
    }
    if (!after.deactivatedAt) {
        throw new Error("deactivatedAt should be set after expiration-based deactivation");
    }

    const proxyauth = await execInContainer(CONTAINER_NAME, `cat ${PROXYAUTH_CONTAINER_PATH}`);

    if (proxyauth.includes(`${USERNAME}:`)) {
        throw new Error(
            `Deactivated user must be absent from the file 3proxy reads, not written as a comment, got:\n${proxyauth}`
        );
    }

    if (proxyauth.includes("# DEACTIVATED")) {
        throw new Error(
            `No deactivated markers belong in the users file; 3proxy parses "#" as an ordinary argument, got:\n${proxyauth}`
        );
    }

    // Maintenance restarts 3proxy when the set of served users changes, so the
    // rejection has to land without an operator doing anything else.
    await users.triggerMaintenance();

    const afterStatus = await waitForProxyStatus(USERNAME, PASSWORD, 407);

    if (afterStatus !== 407) {
        throw new Error(`A deactivated user must be refused by 3proxy with 407, got status ${afterStatus}`);
    }
}
