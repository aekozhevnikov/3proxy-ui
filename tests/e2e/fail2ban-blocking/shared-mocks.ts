// Shared setup, mocks, and utilities for fail2ban-blocking E2E tests

import {
    execAsync,
    execInContainer,
    getFail2banStatus,
    TEST_CONFIG,
    waitForService,
} from "../utils/helpers.js";

const CONTAINER_NAME = "3proxy-ui-e2e-fail2ban";
const TEST_IP = "192.168.99.100";
const LEGIT_IP = "192.168.99.101";

export async function setupEnvironment() {
    try {
        await execAsync("docker --version");
    } catch {
        throw new Error("Docker is required for E2E tests");
    }

    await execAsync("docker build -t 3proxy-ui:e2e-fail2ban .");

    try {
        await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    } catch {}

    const runCmd = [
        "docker run -d",
        `--name ${CONTAINER_NAME}`,
        "--privileged",
        "-e ENABLE_FAIL2BAN=true",
        "-e FAIL2BAN_BANTIME=30",
        "-e FAIL2BAN_FINDTIME=10",
        "-e FAIL2BAN_MAXRETRY=2",
        "-v e2e_f2b_data:/app/data",
        "-v e2e_f2b_logs:/etc/3proxy/logs",
        "-v e2e_f2b_jail:/var/lib/fail2ban",
        "-p 3128:3128",
        "-p 1080:1080",
        "3proxy-ui:e2e-fail2ban",
    ].join(" ");

    await execAsync(runCmd);

    await waitForService(TEST_CONFIG.apiUrl, 120000);

    await execInContainer(CONTAINER_NAME, "npx prisma migrate deploy && npx prisma generate");

    const status = await getFail2banStatus(CONTAINER_NAME);
    if (status.error === "jail_not_active") {
        throw new Error("Fail2ban jail should be active");
    }
}

export async function cleanup() {
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
        await execAsync("docker volume rm e2e_f2b_data 2>/dev/null || true");
        await execAsync("docker volume rm e2e_f2b_logs 2>/dev/null || true");
        await execAsync("docker volume rm e2e_f2b_jail 2>/dev/null || true");
    } catch {}
}

export { CONTAINER_NAME, TEST_IP, LEGIT_IP, execInContainer, getFail2banStatus };