/**
 * E2E Test: Traffic Limit Enforcement
 *
 * A user with a 100 MB limit gets a log entry above the limit, after which
 * maintenance deactivates it, drops it from the users file and reloads 3proxy.
 */
import { PROXYAUTH_CONTAINER_PATH } from "../utils/environment.js";
import { appendLogEntry, buildLogEntry } from "../utils/three-proxy-log.js";
import { execAsync } from "../utils/helpers.js";
import { CONTAINER_NAME, execInContainer, removeUserIfExists, TEST_CONFIG, UserApiClient } from "./shared-setup.js";

const MB = 1024 * 1024;

/** 3proxy answers a request it refuses to authenticate with 407. */
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

export async function testTrafficLimitEnforcement(): Promise<void> {
    const users = new UserApiClient();
    const { username, password } = TEST_CONFIG.testUser;

    await removeUserIfExists(users, username);

    const created = await users.createUser({
        username,
        password,
        dataLimit: TEST_CONFIG.testUser.dataLimit,
        ipLimit: 0,
        isActive: true
    });

    if (!created.isActive) {
        throw new Error("User should be active after creation");
    }

    const limitBytes = TEST_CONFIG.testUser.dataLimit * MB;
    // 110 MB, with margin over the 100 MB limit
    const trafficBytes = 110 * MB;

    await appendLogEntry(
        CONTAINER_NAME,
        buildLogEntry({
            user: username,
            sent: trafficBytes,
            received: 0,
            clientIp: "192.168.1.100",
            clientPort: 54321,
            serverIp: "93.184.216.34",
            serverPort: 443,
            hostname: "secure.example.com",
            message: "CONNECT secure.example.com:443"
        })
    );

    const result = await users.triggerMaintenance();
    if (result.updatedCount < 1) {
        throw new Error("Maintenance did not update any user");
    }

    const after = await users.getUser(created.id);
    if (after.isActive) {
        throw new Error(`User should be deactivated. dataUsed: ${after.dataUsed}, limit: ${after.dataLimit} MB`);
    }
    if (after.dataUsed < limitBytes) {
        throw new Error(`dataUsed ${after.dataUsed} is below the ${limitBytes} byte limit`);
    }
    if (!after.deactivatedAt) {
        throw new Error("deactivatedAt should be set after limit-based deactivation");
    }

    const proxyauth = await execInContainer(CONTAINER_NAME, `cat ${PROXYAUTH_CONTAINER_PATH}`);

    // A "#" line is not a comment in the file 3proxy reads with its $ directive:
    // the included content is parsed recursively with no # handling, so writing
    // a deactivated user as a comment left it registered and able to
    // authenticate. The entry has to be absent, not commented.
    if (proxyauth.includes("# DEACTIVATED")) {
        throw new Error(`No deactivated markers belong in the users file, got:\n${proxyauth}`);
    }

    const activeLine = proxyauth.split("\n").find((line: string) => line.startsWith(`${username}:`));
    if (activeLine) {
        throw new Error(`Deactivated user must be absent from the users file: ${activeLine}`);
    }

    // And the credentials have to actually stop working, without waiting for an
    // unrelated restart.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const status = await proxyStatusFor(username, password);

    if (status !== 407) {
        throw new Error(`3proxy should refuse a deactivated user with 407, got ${status}`);
    }
}
