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

import https from "https";
import http from "http";

import cron from "node-cron";

const SYNC_INTERVAL = process.env.TRAFFIC_SYNC_INTERVAL || "*/30 * * * *"; // Every 30 minutes
const API_URL = process.env.API_URL || "http://localhost:3000";

// Guard against multiple instantiations (HMR in dev)
let isRunning = false;

interface SyncResult {
    success: boolean;
    updatedCount?: number;
    deactivatedCount?: number;
    totalTraffic?: number;
    sourceFile?: string;
    error?: string;
}

async function runMaintenance(): Promise<SyncResult> {
    const url = new URL(`${API_URL}/api/users/maintenance`);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;

    return new Promise((resolve) => {
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: "POST",
            timeout: 60000, // 60 seconds
            headers: {
                "Content-Type": "application/json"
            }
        };

        const req = lib.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);

                    if (res.statusCode === 200 && parsed.success) {
                        resolve({
                            success: true,
                            updatedCount: parsed.updatedCount,
                            totalTraffic: parsed.totalTraffic,
                            sourceFile: parsed.sourceFile
                        });
                    } else {
                        resolve({
                            success: false,
                            error: parsed.error || `HTTP ${res.statusCode}`
                        });
                    }
                } catch (e: unknown) {
                    const error = e instanceof Error ? e : new Error(String(e));

                    resolve({
                        success: false,
                        error: `Failed to parse response: ${error.message}`
                    });
                }
            });
        });

        req.on("error", (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });

        req.on("timeout", () => {
            req.destroy();
            resolve({
                success: false,
                error: "Request timeout after 60 seconds"
            });
        });

        req.write("{}"); // Empty JSON body
        req.end();
    });
}

function log(message: string, type: "info" | "error" | "success" = "info") {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;

    switch (type) {
        case "error":
            console.error(`${prefix} ${message}`);
            break;
        case "success":
            console.log(`${prefix} ✓ ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function startMaintenanceScheduler() {
    // Prevent multiple instances (HMR in dev)
    if (isRunning) {
        log("Scheduler already running, skipping duplicate start", "info");

        return null;
    }
    isRunning = true;

    log("Starting maintenance scheduler...");
    log(`Sync interval: ${SYNC_INTERVAL}`);
    log(`API endpoint: ${API_URL}/api/users/maintenance`);

    // Run immediately on startup
    (async () => {
        const result = await runMaintenance();

        if (result.success) {
            const deactivatedMsg =
                result.deactivatedCount && result.deactivatedCount > 0
                    ? `, ${result.deactivatedCount} deactivated`
                    : "";

            log(
                `Initial maintenance: ${result.updatedCount} users${deactivatedMsg}, ${formatBytes(result.totalTraffic || 0)} (${result.sourceFile})`,
                "success"
            );
        } else {
            log(`Initial maintenance failed: ${result.error}`, "error");
        }
    })();

    // Schedule recurring job
    const job = cron.schedule(
        SYNC_INTERVAL,
        async () => {
            log("Running scheduled maintenance...");

            const result = await runMaintenance();

            if (result.success) {
                const deactivatedMsg =
                    result.deactivatedCount && result.deactivatedCount > 0
                        ? `, ${result.deactivatedCount} deactivated`
                        : "";

                log(
                    `Maintenance successful: ${result.updatedCount} users${deactivatedMsg}, ${formatBytes(result.totalTraffic || 0)}`,
                    "success"
                );
            } else {
                log(`Maintenance failed: ${result.error}`, "error");
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
