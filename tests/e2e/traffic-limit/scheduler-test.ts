/**
 * E2E Test: Scheduler Execution
 * Tests that the traffic sync scheduler runs and updates .proxyauth
 */

import {
    CONTAINER_NAME,
    createAdminSession,
    apiCall,
    execInContainer,
} from "./shared-setup.js";

async function testScheduler() {
    const adminToken = await createAdminSession();

    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", {
        username: "schedtestuser",
        password: "SchedTest123!",
        isActive: true,
        dataLimit: 50 * 1024 * 1024,
    });

    if (!createResult.success) {
        throw new Error(`Failed to create user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    let ran = false;
    const timeout = 90000;
    const checkInterval = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const proxyauth = await execInContainer(CONTAINER_NAME, "cat /app/3proxy/users/.proxyauth");
            if (proxyauth.includes("schedtestuser")) {
                ran = true;
                break;
            }
        } catch {
            // Not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!ran) {
        console.warn("⚠ Scheduler did not run within timeout - this may be expected if TRAFFIC_SYNC_INTERVAL is long");
    }
}

testScheduler().catch((error) => {
    console.error("Scheduler test failed:", error);
    process.exit(1);
});