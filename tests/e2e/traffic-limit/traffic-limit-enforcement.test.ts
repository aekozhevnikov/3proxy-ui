/**
 * E2E Test: Traffic Limit Enforcement
 *
 * Пользователь с лимитом 100 МБ получает запись лога сверх лимита,
 * после чего maintenance деактивирует его и комментирует запись в .proxyauth.
 */
import { PROXYAUTH_CONTAINER_PATH } from "../utils/environment.js";
import { appendLogEntry, buildLogEntry } from "../utils/three-proxy-log.js";
import { CONTAINER_NAME, execInContainer, removeUserIfExists, TEST_CONFIG, UserApiClient } from "./shared-setup.js";

const MB = 1024 * 1024;

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
    // 110 МБ — с запасом над лимитом в 100 МБ
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
    const deactivatedLine = proxyauth
        .split("\n")
        .find((line: string) => line.startsWith("# DEACTIVATED") && line.includes(`${username}:`));

    if (!deactivatedLine) {
        throw new Error(`Deactivated user should be commented in .proxyauth, got:\n${proxyauth}`);
    }

    const activeLine = proxyauth.split("\n").find((line: string) => line.startsWith(`${username}:`));
    if (activeLine) {
        throw new Error(`Deactivated user must not have an active entry in .proxyauth: ${activeLine}`);
    }
}
