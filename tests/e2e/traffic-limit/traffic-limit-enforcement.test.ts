/**
 * E2E Test: Traffic Limit Enforcement
 * Tests user deactivation when traffic exceeds data limit
 */

import {
    CONTAINER_NAME,
    createAdminSession,
    apiCall,
    execInContainer,
    TEST_CONFIG,
} from "./shared-setup.js";

async function testTrafficLimitEnforcement() {
    const adminToken = await createAdminSession();

    const createUserData = {
        username: TEST_CONFIG.testUser.username,
        password: TEST_CONFIG.testUser.password,
        dataLimit: TEST_CONFIG.testUser.dataLimit,
        ipLimit: 1,
        telegramUserId: TEST_CONFIG.testUser.telegramUserId,
        isActive: true,
    };

    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", createUserData);
    if (!createResult.success) {
        throw new Error(`Failed to create test user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    const userCheck = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (!userCheck.isActive) {
        throw new Error("User should be active after creation");
    }

    const totalTraffic = 110 * 1024 * 1024; // 110 MB

    const timestamp = Math.floor(Date.now() / 1000);
    const logEntry =
        JSON.stringify({
            time_unix: timestamp,
            proxy: { "type:": "HTTP", port: 3128 },
            auth: { user: TEST_CONFIG.testUser.username },
            bytes: { sent: totalTraffic, received: 0 },
        }) + "\n";

    await execInContainer(CONTAINER_NAME, `sh -c "echo '${logEntry}' >> /etc/3proxy/logs/3proxy.log"`);

    const maintenanceResult = await apiCall(adminToken, "/api/users/maintenance", "POST", {});
    if (!maintenanceResult.success) {
        throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (userAfter.isActive) {
        throw new Error(`User should be deactivated. Data used: ${userAfter.dataUsed}, limit: ${userAfter.dataLimit}`);
    }

    const proxyauthContent = await execInContainer(CONTAINER_NAME, "cat /app/3proxy/users/.proxyauth");

    if (!proxyauthContent.includes(`# DEACTIVATED`)) {
        if (proxyauthContent.match(new RegExp(`^${TEST_CONFIG.testUser.username}:`))) {
            throw new Error("Deactivated user should be commented in .proxyauth");
        }
    }

    const activePattern = new RegExp(`^${TEST_CONFIG.testUser}:`, "m");
    if (
        !activePattern.test(proxyauthContent) &&
        !proxyauthContent.includes(`# DEACTIVATED ${TEST_CONFIG.testUser.username}`)
    ) {
        throw new Error("User not found in .proxyauth (expected as commented deactivated entry)");
    }
}

testTrafficLimitEnforcement().catch((error) => {
    console.error("Traffic limit enforcement test failed:", error);
    process.exit(1);
});