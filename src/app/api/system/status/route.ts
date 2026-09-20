import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import {
    getDirectoryStats,
    get3proxyPid,
    get3proxyPidFromDocker,
    find3proxyContainer,
    get3proxyVersion,
    get3proxyMemoryUsage
} from "@/src/core/system-info";

export async function GET() {
    try {
        let is3proxyRunning: boolean;
        let pid: number | null;
        let containerInfo: { id: string; name: string } | null = null;

        pid = await get3proxyPid();
        is3proxyRunning = pid !== null;

        if (!is3proxyRunning) {
            containerInfo = await find3proxyContainer();

            if (containerInfo) {
                is3proxyRunning = true;
                pid = await get3proxyPidFromDocker(containerInfo.id);
            }
        }

        const version = await get3proxyVersion(containerInfo);

        // Check .proxyauth file stats
        const proxyauthPath = path.join(process.cwd(), "3proxy", "users", ".proxyauth");
        let userCount = 0;
        let proxyauthSize = 0;
        let proxyauthModified: string | null = null;

        try {
            const stat = await fs.stat(proxyauthPath);

            proxyauthSize = stat.size;
            proxyauthModified = stat.mtime.toISOString();

            const content = await fs.readFile(proxyauthPath, "utf8");

            userCount = content.split("\n").filter((line: string) => {
                line = line.trim();

                return line.length > 0 && !line.startsWith("#");
            }).length;
        } catch {
            // File doesn't exist or can't be read
        }

        // Get 3proxy.cfg info
        const configPath = path.join(process.cwd(), "3proxy", "3proxy.cfg");
        let configExists: boolean;
        let configModified: string | null = null;

        try {
            const stat = await fs.stat(configPath);

            configExists = true;
            configModified = stat.mtime.toISOString();
        } catch {
            configExists = false;
        }

        // Check disk space for logs
        const logsPath = path.join(process.cwd(), "3proxy", "logs");
        let logSize = 0;
        let logFileCount = 0;

        try {
            const logStats = await getDirectoryStats(logsPath);

            logSize = logStats.totalSize;
            logFileCount = logStats.fileCount;
        } catch {
            // Logs directory doesn't exist
        }

        // Read traffic sync info
        let trafficSync: { lastSync: string | null; updatedCount: number } | undefined;

        try {
            const syncInfoPath = "/var/lib/3proxy-ui/traffic-sync.json";
            const syncData = await fs.readFile(syncInfoPath, "utf-8");
            const parsed = JSON.parse(syncData);

            trafficSync = {
                lastSync: parsed.lastSync || null,
                updatedCount: parsed.updatedCount || 0
            };
        } catch {
            // Sync info doesn't exist yet
        }

        const memoryUsage = is3proxyRunning ? await get3proxyMemoryUsage(containerInfo) : null;

        const response = {
            success: true,
            status: {
                isRunning: is3proxyRunning,
                version,
                memoryUsage,
                pid
            },
            config: {
                exists: configExists,
                modified: configModified,
                path: configPath
            },
            users: {
                count: userCount,
                proxyauthSize,
                proxyauthModified
            },
            logs: {
                size: logSize,
                fileCount: logFileCount,
                path: logsPath
            },
            timestamp: new Date().toISOString(),
            ...(trafficSync && { trafficSync })
        };

        return NextResponse.json(response, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    } catch (error) {
        console.error("System status error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to get system status",
                error: error instanceof Error ? error.message : "unknown error"
            },
            { status: 500 }
        );
    }
}
