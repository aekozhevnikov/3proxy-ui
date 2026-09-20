/**
 * E2E Test: Manual Maintenance Trigger
 * Tests that maintenance can be triggered manually via API
 */

import {
    createAdminSession,
    apiCall,
} from "./shared-setup.js";

async function testManualMaintenanceTrigger() {
    const adminToken = await createAdminSession();

    const result = await apiCall(adminToken, "/api/users/maintenance", "POST", {});

    if (!result.success) {
        throw new Error(`Maintenance should succeed: ${result.error}`);
    }
}

testManualMaintenanceTrigger().catch((error) => {
    console.error("Manual maintenance trigger test failed:", error);
    process.exit(1);
});