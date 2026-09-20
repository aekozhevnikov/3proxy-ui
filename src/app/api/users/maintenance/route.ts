import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { logger } from "@/src/core/logger";
import { findLogsDir, clearLogsDirCache } from "@/src/lib/logs-finder";
import { parseTrafficLogs } from "@/src/lib/traffic-parser";
import { updateProxyauthFile } from "@/src/lib/proxyauth-writer";
import { processTrafficLimits, processExpiration } from "@/src/lib/maintenance";

const SYNC_INFO_FILE = process.env.SYNC_INFO_FILE || path.join(process.cwd(), "data", "traffic-sync.json");

export async function POST(request: Request): Promise<Response> {
    try {
        const now = new Date();
        let updatedCount = 0;
        let totalTraffic = 0;
        let deactivatedCount = 0;

        clearLogsDirCache();

        let overrideLogsDir: string | undefined;

        try {
            const body = await request.json();

            if (body.logsDir) {
                overrideLogsDir = body.logsDir;
                logger.debug(`[maintenance] Using override logsDir from request: ${overrideLogsDir}`);
            }
        } catch {
            // No body or invalid JSON, ignore
        }

        const logsDir = overrideLogsDir ? await Promise.resolve(overrideLogsDir) : await findLogsDir();

        if (logsDir) {
            const files = await fs.readdir(logsDir);
            const logFiles = files.filter((file) => file.startsWith("3proxy.log") || file.endsWith(".log"));

            if (logFiles.length > 0) {
                const fileStats = await Promise.all(
                    logFiles.map(async (file) => {
                        const stats = await fs.stat(path.join(logsDir, file));

                        return { name: file, mtime: stats.mtime };
                    })
                );

                fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
                const latestLog = fileStats[0].name;
                const latestLogPath = path.join(logsDir, latestLog);
                const content = await fs.readFile(latestLogPath, "utf-8");
                const lines = content.split("\n");

                const { trafficMap } = parseTrafficLogs(lines);

                const trafficResult = await processTrafficLimits({ trafficMap, now });

                updatedCount += trafficResult.updatedCount;
                deactivatedCount += trafficResult.deactivatedCount;
                totalTraffic += trafficResult.totalTraffic;

                logger.debug(
                    `[maintenance] Traffic sync: ${trafficResult.updatedCount} users updated from ${latestLog}, total traffic: ${trafficResult.totalTraffic} bytes`
                );
            }
        }

        const expirationResult = await processExpiration(now);

        deactivatedCount += expirationResult.deactivatedCount;

        const proxyStats = await updateProxyauthFile();

        try {
            await fs.mkdir(path.dirname(SYNC_INFO_FILE), { recursive: true });
            await fs.writeFile(
                SYNC_INFO_FILE,
                JSON.stringify({
                    lastSync: now.toISOString(),
                    updatedCount,
                    deactivatedCount: proxyStats.deactivatedCount + deactivatedCount,
                    sourceFile: logsDir
                        ? (await fs.readdir(logsDir)).find((f) => f.startsWith("3proxy.log")) || "unknown"
                        : "no logs"
                })
            );
        } catch (err) {
            logger.error("[maintenance] Failed to write sync info file:", err);
        }

        return NextResponse.json({
            success: true,
            message: `Maintenance completed`,
            updatedCount,
            deactivatedCount: proxyStats.deactivatedCount + deactivatedCount,
            totalTraffic,
            sourceFile: logsDir ? (await fs.readdir(logsDir)).find((f) => f.startsWith("3proxy.log")) : "none"
        });
    } catch (error) {
        logger.error("[maintenance] Failed:", error);

        return NextResponse.json({ success: false, error: "Maintenance failed" }, { status: 500 });
    }
}
