import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { logger } from "@/src/core/logger";
import { findLogsDir, clearLogsDirCache } from "@/src/lib/logs-finder";
import { parseTrafficLogs } from "@/src/lib/traffic-parser";
import { updateProxyauthFile } from "@/src/lib/proxyauth-writer";
import { processTrafficLimits, processExpiration } from "@/src/lib/maintenance";
import { identifyLogFile, readNewLogContent, readSyncState, seedOffsets, writeSyncState } from "@/src/lib/traffic-sync";

export async function POST(request: Request): Promise<Response> {
    try {
        const now = new Date();
        let updatedCount = 0;
        let totalTraffic = 0;
        let deactivatedCount = 0;
        let sourceFile = "no logs";

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
                const identities: { name: string; key: string; size: number }[] = [];

                for (const name of logFiles) {
                    try {
                        const { key, size } = await identifyLogFile(path.join(logsDir, name));

                        identities.push({ name, key, size });
                    } catch {
                        // File may have disappeared between readdir and stat
                    }
                }

                if (identities.length > 0) {
                    const state = await readSyncState();

                    // Upgrade from the previous version: the state file exists but
                    // carries no offsets, so the accumulated history was already
                    // accounted for and must be skipped. A clean start reads from zero.
                    const offsets = state.offsets ?? (state.existed ? seedOffsets(identities) : {});
                    let contributor = "";

                    try {
                        for (const file of identities) {
                            const { lines, nextOffset } = await readNewLogContent(
                                path.join(logsDir, file.name),
                                offsets[file.key],
                                file.size
                            );

                            offsets[file.key] = nextOffset;

                            if (lines.length === 0) continue;

                            const { trafficMap } = parseTrafficLogs(lines);

                            const trafficResult = await processTrafficLimits({ trafficMap, now });

                            updatedCount += trafficResult.updatedCount;
                            deactivatedCount += trafficResult.deactivatedCount;
                            totalTraffic += trafficResult.totalTraffic;

                            if (trafficResult.totalTraffic > 0) {
                                contributor = file.name;
                            }

                            logger.debug(
                                `[maintenance] Traffic sync: ${trafficResult.updatedCount} users updated from ${file.name}, total traffic: ${trafficResult.totalTraffic} bytes`
                            );
                        }
                    } finally {
                        // State is persisted even on error: the offsets of the
                        // files already processed reflect the bytes really accounted
                        // for, and lastSync must not freeze because of a single
                        // failure — otherwise the next run cannot resume.
                        sourceFile = contributor || identities[0].name;

                        await writeSyncState({
                            ...state,
                            offsets,
                            lastSync: now.toISOString(),
                            updatedCount,
                            deactivatedCount,
                            totalTraffic,
                            sourceFile
                        });
                    }
                }
            }
        }

        const expirationResult = await processExpiration(now);

        deactivatedCount += expirationResult.deactivatedCount;

        const proxyStats = await updateProxyauthFile();

        return NextResponse.json({
            success: true,
            message: `Maintenance completed`,
            updatedCount,
            deactivatedCount: proxyStats.deactivatedCount + deactivatedCount,
            totalTraffic,
            sourceFile
        });
    } catch (error) {
        logger.error("[maintenance] Failed:", error);

        return NextResponse.json({ success: false, error: "Maintenance failed" }, { status: 500 });
    }
}
