#!/usr/bin/env node

/**
 * Maintenance Scheduler
 *
 * Runs inside the Node.js process and performs user maintenance every 30 minutes.
 * Maintenance includes:
 * - Traffic synchronization and limit enforcement
 * - Expiration date checks
 * - .proxyauth file regeneration
 *
 * This is an alternative to OS-level cron.
 *
 * Usage:
 * 1. Install node-cron: npm install node-cron
 * 2. Import and start in your main app file (e.g., src/app/page.tsx or server.js)
 *
 * Example:
 *   import { startMaintenanceScheduler } from '@/scripts/maintenance-scheduler';
 *   startMaintenanceScheduler();
 */

import cron from "node-cron";

import { log, formatMaintenanceSummary } from "@/src/lib/maintenance-runner";
import { runMaintenanceJob } from "@/src/lib/maintenance-job";

const SYNC_INTERVAL = process.env.TRAFFIC_SYNC_INTERVAL || "*/30 * * * *"; // Every 30 minutes

// Guard against multiple instantiations (HMR in dev)
let isRunning = false;

export function startMaintenanceScheduler() {
    // Prevent multiple instances (HMR in dev)
    if (isRunning) {
        log("Scheduler already running, skipping duplicate start", "info");

        return null;
    }
    isRunning = true;

    log("Starting maintenance scheduler...");
    log(`Sync interval: ${SYNC_INTERVAL}`);

    // Run immediately on startup
    (async () => {
        try {
            const result = await runMaintenanceJob();

            log(`Initial ${formatMaintenanceSummary(result)}`, "success");
        } catch (error) {
            log(`Initial maintenance failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
    })();

    // Schedule recurring job
    const job = cron.schedule(
        SYNC_INTERVAL,
        async () => {
            log("Running scheduled maintenance...");

            try {
                const result = await runMaintenanceJob();

                log(formatMaintenanceSummary(result), "success");
            } catch (error) {
                log(`Maintenance failed: ${error instanceof Error ? error.message : String(error)}`, "error");
            }
        },
        {
            scheduled: true,
            timezone: "UTC" // Change as needed
        }
    );

    log("Scheduler started");

    // Graceful shutdown
    process.on("SIGINT", () => {
        log("Stopping scheduler...");
        job.stop();
        process.exit(0);
    });

    process.on("SIGTERM", () => {
        log("Stopping scheduler...");
        job.stop();
        process.exit(0);
    });

    return job;
}

// Note: This file is intended to be imported and started via startBackgroundTasks()
// Direct execution (node scripts/traffic-scheduler.ts) is not supported in ES modules
