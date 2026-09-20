/**
 * E2E Test: Expiration Deactivation
 * Tests user deactivation when subscription expires
 */

import {
    createAdminSession,
    apiCall,
} from "./shared-setup.js";

async function testExpirationDeactivation() {
    const adminToken = await createAdminSession();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const createUserData = {
        username: "expireduser",
        password: "ExpiredPass123!",
        isActive: true,
        expiresAt: pastDate.toISOString(),
        dataLimit: 50 * 1024 * 1024,
    };

    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", createUserData);
    if (!createResult.success) {
        throw new Error(`Failed to create expired user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    const maintenanceResult = await apiCall(adminToken, "/api/users/maintenance", "POST", {});
    if (!maintenanceResult.success) {
        throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (userAfter.isActive) {
        throw new Error("User with expired subscription should be deactivated");
    }
    if (!userAfter.deactivatedAt) {
        throw new Error("DeactivatedAt should be set");
    }
}

testExpirationDeactivation().catch((error) => {
    console.error("Expiration deactivation test failed:", error);
    process.exit(1);
});