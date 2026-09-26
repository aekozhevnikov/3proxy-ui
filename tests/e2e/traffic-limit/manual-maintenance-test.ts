/**
 * E2E Test: Manual Maintenance Trigger
 *
 * Verifies the response contract of POST /api/users/maintenance.
 */
import { apiCall, createAdminSession } from "./shared-setup.js";

export async function testManualMaintenanceTrigger(): Promise<void> {
    const token = await createAdminSession();

    const result = await apiCall(token, "/api/users/maintenance", "POST", {});

    if (!result.success) {
        throw new Error(`Maintenance should succeed: ${result.error}`);
    }
    if (typeof result.updatedCount !== "number") {
        throw new Error(`Maintenance should report updatedCount, got: ${JSON.stringify(result)}`);
    }
    if (typeof result.totalTraffic !== "number") {
        throw new Error(`Maintenance should report totalTraffic, got: ${JSON.stringify(result)}`);
    }
}
