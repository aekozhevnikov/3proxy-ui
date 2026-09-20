// Shared setup/cleanup for traffic-limit E2E tests

import {
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    TEST_CONFIG,
    waitForService,
} from "../utils/helpers.js";

const CONTAINER_NAME = "3proxy-ui-e2e-test";

export async function setupTestEnvironment() {
    try {
        await execAsync("docker --version");
    } catch (error) {
        throw new Error("Docker is required for E2E tests. Please install Docker first.");
    }

    const buildCmd = `docker build -t 3proxy-ui:e2e-test .`;
    await execAsync(buildCmd);

    try {
        await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    } catch {
        // Ignore
    }

    const runCmd = [
        "docker run -d",
        `--name ${CONTAINER_NAME}`,
        "--privileged",
        "-e DATABASE_URL=file:/app/data/test.db",
        "-e NEXT_PUBLIC_API_URL=http://localhost:3000",
        "-e API_URL=http://localhost:3000",
        "-e JWT_SECRET=test-secret-key-minimum-32-characters-long",
        "-e ENABLE_FAIL2BAN=true",
        "-e FAIL2BAN_BANTIME=60",
        "-e FAIL2BAN_FINDTIME=10",
        "-e FAIL2BAN_MAXRETRY=2",
        "-e TRAFFIC_SYNC_INTERVAL=*/1 * * * *",
        "-p 3000:3000",
        "-p 3128:3128",
        "-p 1080:1080",
        "-v e2e_data:/app/data",
        "-v e2e_logs:/etc/3proxy/logs",
        "-v e2e_fail2ban:/var/lib/fail2ban",
        "3proxy-ui:e2e-test",
    ].join(" ");

    await execAsync(runCmd);

    await waitForService(TEST_CONFIG.apiUrl, 120000);

    await execInContainer(CONTAINER_NAME, "npx prisma migrate deploy && npx prisma generate");
}

export async function cleanupTestEnvironment() {
    try {
        await execAsync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    } catch (error) {
        if (error instanceof Error) {
            console.warn("Cleanup warning:", error.message);
        }
    }

    try {
        await execAsync("docker rmi 3proxy-ui:e2e-test 2>/dev/null || true");
    } catch {
        // Ignore
    }

    try {
        await execAsync("docker volume rm e2e_data 2>/dev/null || true");
        await execAsync("docker volume rm e2e_logs 2>/dev/null || true");
        await execAsync("docker volume rm e2e_fail2ban 2>/dev/null || true");
    } catch {
        // Ignore
    }
}

export { CONTAINER_NAME, createAdminSession, apiCall, execAsync, execInContainer, TEST_CONFIG };