import { formatBytes } from "@/src/core/utils";
import type { MaintenanceResult } from "@/src/lib/maintenance-job";

export function log(message: string, type: "info" | "error" | "success" = "info") {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;

    switch (type) {
        case "error":
            console.error(`${prefix} ${message}`);
            break;
        case "success":
            // Success used to print nothing, which is why a scheduler that had
            // been failing silently went unnoticed. A line per run is cheap.
            console.log(`${prefix} ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
}

export function formatMaintenanceSummary(result: MaintenanceResult): string {
    const deactivatedMsg =
        result.deactivatedCount && result.deactivatedCount > 0 ? `, ${result.deactivatedCount} deactivated` : "";

    return `Maintenance: ${result.updatedCount} users${deactivatedMsg}, ${formatBytes(result.totalTraffic || 0)} (${result.sourceFile})`;
}

export { formatBytes };
