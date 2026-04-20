import { startMaintenanceScheduler } from "@/scripts/maintenance-scheduler";

/**
 * Starts background tasks (schedulers, etc.)
 * Call this once when the application starts
 */
export function startBackgroundTasks() {
    // Always start maintenance (traffic sync + cleanup) scheduler
    startMaintenanceScheduler();
}
