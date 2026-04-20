import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { prisma } from "@/src/prisma/db";
import { logger } from "@/src/core/logger";

const SYNC_INFO_FILE = process.env.SYNC_INFO_FILE || path.join(process.cwd(), "data", "traffic-sync.json");
const PROXYAUTH_PATH = process.env.PROXYAUTH_PATH || path.join(process.cwd(), "3proxy", "users", ".proxyauth");

// Possible log directories to check (in order of priority)
const POSSIBLE_LOGS_DIRS = [process.env.LOGS_DIR, "/var/log/3proxy", "./logs", "./3proxy/logs"] as const;

let cachedLogsDir: string | null = null;

// Telegram notification helper
async function sendTelegramNotification(
    telegramUserId: string,
    username: string,
    dataUsed: number,
    dataLimit: number,
    reason: string = "data limit"
): Promise<boolean> {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (!botToken) {
            logger.warn("[maintenance] TELEGRAM_BOT_TOKEN not set, skipping notification");

            return false;
        }

        const message =
            `⚠️ *Account Deactivated*\n\n` +
            `User: *${username}*\n` +
            `Reason: *${reason}*\n` +
            `Data used: *${(dataUsed / 1024 / 1024).toFixed(2)} MB*\n` +
            `Data limit: *${(dataLimit / 1024 / 1024).toFixed(2)} MB*\n` +
            `Your proxy access has been disabled. Please contact support if you need assistance.`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: telegramUserId,
                text: message,
                parse_mode: "Markdown"
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
        }

        logger.info(`[maintenance] Telegram notification sent to user ${username} (${telegramUserId})`);

        return true;
    } catch (error) {
        logger.error(`[maintenance] Failed to send Telegram notification:`, error);

        return false;
    }
}

// Update .proxyauth: regenerate entire file from ProxyUser table
// All proxy users (including admin) are stored in ProxyUser, so we just output them all
async function updateProxyauthFile(): Promise<{ updatedCount: number; deactivatedCount: number }> {
    // Get all users from database
    const allUsers = await prisma.proxyUser.findMany({
        orderBy: { username: "asc" }
    });

    const newLines: string[] = [];
    let updatedCount = 0;

    // Generate lines for all users
    for (const user of allUsers) {
        if (user.isActive) {
            // Active users: plain format
            // Note: flags (dataLimit, expiresAt, ipLimit) are not needed in .proxyauth
            // They are enforced by the maintenance logic via deactivation
            newLines.push(`${user.username}:${user.password}`);
        } else {
            // Deactivated users: commented with timestamp
            const dateStr = user.deactivatedAt ? user.deactivatedAt.toISOString() : "";

            newLines.push(`# DEACTIVATED ${dateStr}: ${user.username}:${user.password}`);
        }
        updatedCount++;
    }

    // Write file (overwrite completely)
    await fs.mkdir(path.dirname(PROXYAUTH_PATH), { recursive: true });
    const finalContent = newLines.join("\n") + "\n";

    await fs.writeFile(PROXYAUTH_PATH, finalContent, "utf-8");

    const deactivatedCount = allUsers.filter((u) => !u.isActive).length;

    logger.info(
        `[maintenance] Updated .proxyauth: ${allUsers.length} users (${allUsers.length - deactivatedCount} active, ${deactivatedCount} deactivated)`
    );
    logger.debug(`[maintenance] File at: ${PROXYAUTH_PATH}`);

    return {
        updatedCount,
        deactivatedCount
    };
}

async function findLogsDir(): Promise<string | null> {
    if (cachedLogsDir) {
        console.debug(`[maintenance] Using cached logs dir: ${cachedLogsDir}`);

        return cachedLogsDir;
    }

    console.debug(
        `[maintenance] Searching for logs directory with .log files in: ${POSSIBLE_LOGS_DIRS.filter(Boolean).join(", ")}`
    );

    for (const dir of POSSIBLE_LOGS_DIRS) {
        if (!dir) continue;
        try {
            await fs.access(dir);
            const files = await fs.readdir(dir);
            const logFiles = files.filter((file) => file.startsWith("3proxy.log") || file.endsWith(".log"));

            if (logFiles.length > 0) {
                console.debug(`[maintenance] Found logs directory with ${logFiles.length} .log file(s): ${dir}`);
                cachedLogsDir = dir;

                return dir;
            } else {
                console.debug(`[maintenance] Directory exists but no .log files found: ${dir}`);
            }
        } catch {
            continue;
        }
    }

    console.error(`[maintenance] No logs directory with .log files found`);

    return null;
}

export async function POST(request: Request): Promise<Response> {
    try {
        const now = new Date();
        let updatedCount = 0;
        let totalTraffic = 0;

        // Reset cached logs dir to allow re-discovery (important for tests)
        cachedLogsDir = null;

        // Allow overriding logsDir via request body (for testing)
        let overrideLogsDir: string | undefined;

        try {
            const body = await request.json();

            if (body.logsDir) {
                overrideLogsDir = body.logsDir;
                console.debug(`[maintenance] Using override logsDir from request: ${overrideLogsDir}`);
            }
        } catch {
            // No body or invalid JSON, ignore
        }

        // 1. Process traffic logs and deactivate by data limit
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

                const trafficMap = new Map<string, { sent: number; received: number; requests: number }>();

                for (const line of lines) {
                    if (!line.trim()) continue;

                    let username: string | null = null;
                    let sent: number = 0;
                    let received: number = 0;

                    // Try JSON format first (LogFormat JSON)
                    try {
                        const entry = JSON.parse(line);

                        if (entry && entry.auth && entry.bytes) {
                            username = entry.auth.user;
                            sent = entry.bytes.sent || 0;
                            received = entry.bytes.received || 0;
                        }
                    } catch {
                        // Not JSON, fall back to text format
                    }

                    if (!username) {
                        const match = line.match(/^(\S+).*?"\S+\s+\S+"\s+(\d+)\s+(\d+)\s+(\d+)/);

                        if (!match) continue;

                        const ipPort = match[1];

                        sent = parseInt(match[3], 10);
                        received = parseInt(match[4], 10);

                        username = ipPort.includes(":") ? ipPort.split(":")[0] : ipPort;
                    }

                    if (!username) continue;

                    const current = trafficMap.get(username) || { sent: 0, received: 0, requests: 0 };

                    trafficMap.set(username, {
                        sent: current.sent + sent,
                        received: current.received + received,
                        requests: current.requests + 1
                    });
                }

                // Update traffic and deactivate by limit
                for (const [ip, stats] of trafficMap.entries()) {
                    const totalUsed = stats.sent + stats.received;

                    totalTraffic += totalUsed;

                    const user = await prisma.proxyUser.findFirst({
                        where: { username: ip }
                    });

                    if (user) {
                        const newDataUsed = Number(user.dataUsed) + totalUsed;
                        const shouldDeactivate =
                            user.dataLimit !== null && newDataUsed >= Number(user.dataLimit) && user.isActive === true;

                        await prisma.proxyUser.update({
                            where: { id: user.id },
                            data: {
                                dataUsed: newDataUsed
                            }
                        });

                        if (shouldDeactivate) {
                            await prisma.proxyUser.update({
                                where: { id: user.id },
                                data: {
                                    isActive: false,
                                    deactivatedAt: now
                                }
                            });
                            deactivatedCount++;

                            if (user.telegramUserId) {
                                await sendTelegramNotification(
                                    user.telegramUserId,
                                    user.username,
                                    newDataUsed,
                                    Number(user.dataLimit!),
                                    "data limit exceeded"
                                );
                            }

                            console.debug(
                                `[maintenance] User ${user.username} deactivated due to exceeding data limit (${newDataUsed / 1024 / 1024} MB / ${Number(user.dataLimit) / 1024 / 1024} MB)`
                            );
                        }

                        updatedCount++;
                    }
                }

                console.debug(
                    `[maintenance] Traffic sync: ${updatedCount} users updated from ${latestLog}, total traffic: ${totalTraffic} bytes`
                );
            }
        }

        // 2. Deactivate users with expired expiresAt
        const expiredUsers = await prisma.proxyUser.findMany({
            where: {
                isActive: true,
                expiresAt: { lt: now }
            }
        });

        for (const user of expiredUsers) {
            await prisma.proxyUser.update({
                where: { id: user.id },
                data: {
                    isActive: false,
                    deactivatedAt: now
                }
            });
            deactivatedCount++;

            if (user.telegramUserId) {
                await sendTelegramNotification(
                    user.telegramUserId,
                    user.username,
                    Number(user.dataUsed),
                    Number(user.dataLimit || 0),
                    "subscription expired"
                );
            }

            console.debug(
                `[maintenance] User ${user.username} deactivated due to expiration (expired at: ${user.expiresAt})`
            );
        }

        if (expiredUsers.length > 0) {
            console.debug(`[maintenance] Deactivated ${expiredUsers.length} users due to expiration`);
        }

        // 3. Update .proxyauth file
        const proxyStats = await updateProxyauthFile();

        // 4. Save sync info
        try {
            await fs.mkdir(path.dirname(SYNC_INFO_FILE), { recursive: true });
            await fs.writeFile(
                SYNC_INFO_FILE,
                JSON.stringify({
                    lastSync: now.toISOString(),
                    updatedCount,
                    deactivatedCount: proxyStats.deactivatedCount,
                    sourceFile: logsDir
                        ? (await fs.readdir(logsDir)).find((f) => f.startsWith("3proxy.log")) || "unknown"
                        : "no logs"
                })
            );
        } catch (err) {
            console.error("[maintenance] Failed to write sync info file:", err);
        }

        return NextResponse.json({
            success: true,
            message: `Maintenance completed`,
            updatedCount,
            deactivatedCount: proxyStats.deactivatedCount,
            totalTraffic,
            sourceFile: logsDir ? (await fs.readdir(logsDir)).find((f) => f.startsWith("3proxy.log")) : "none"
        });
    } catch (error) {
        console.error("[maintenance] Failed:", error);

        return NextResponse.json({ success: false, error: "Maintenance failed" }, { status: 500 });
    }
}
