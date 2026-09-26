import https from "https";
import http from "http";

import { formatBytes } from "@/src/core/utils";

const API_URL = process.env.API_URL || "http://localhost:3000";

export interface SyncResult {
    success: boolean;
    updatedCount?: number;
    deactivatedCount?: number;
    totalTraffic?: number;
    sourceFile?: string;
    error?: string;
}

export async function runMaintenance(): Promise<SyncResult> {
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
                            deactivatedCount: parsed.deactivatedCount,
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

        req.on("error", (err: NodeJS.ErrnoException) => {
            // Node 20 reports a refused connection as an AggregateError whose
            // message is empty, which would leave the log blank.
            resolve({
                success: false,
                error: err.message || err.code || String(err)
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

export function log(message: string, type: "info" | "error" | "success" = "info") {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;

    switch (type) {
        case "error":
            console.error(`${prefix} ${message}`);
            break;
        case "success":
            break;
        default:
    }
}

export function formatMaintenanceSummary(result: SyncResult): string {
    if (!result.success) {
        return `Maintenance failed: ${result.error}`;
    }

    const deactivatedMsg =
        result.deactivatedCount && result.deactivatedCount > 0 ? `, ${result.deactivatedCount} deactivated` : "";

    return `Maintenance: ${result.updatedCount} users${deactivatedMsg}, ${formatBytes(result.totalTraffic || 0)} (${result.sourceFile})`;
}

export { formatBytes };
