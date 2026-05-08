import { promises as fs } from "fs";
import path from "path";

export interface UserTrafficStats {
    totalRequests: number;
    totalSent: number;
    totalReceived: number;
}

export interface LogEntry {
    auth?: { user?: string };
    client?: { ip?: string };
    bytes?: { sent?: number; received?: number };
}

// Cache for 30 seconds to avoid re-reading logs on every request
let cache: { data: Map<string, UserTrafficStats>; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Returns the default logs directory based on environment
 */
function getDefaultLogsDir(): string {
    // In development, use project-relative path where possible
    if (process.env.NODE_ENV !== "production") {
        const cwd = process.cwd();

        return path.resolve(cwd, "3proxy/logs");
    }

    // In production, use /var/log/3proxy
    return "/var/log/3proxy";
}

/**
 * Reads all 3proxy log files and aggregates traffic by username/IP
 * Returns Map where key = username (or IP if username not found)
 * Supports both traditional text format and JSON format (LogFormat JSON)
 */
export async function readTrafficLogs(): Promise<Map<string, UserTrafficStats>> {
    const now = Date.now();

    // Return cached data if still fresh
    if (cache && now - cache.timestamp < CACHE_TTL) {
        return cache.data;
    }

    const logsDir = process.env.LOGS_DIR || getDefaultLogsDir();
    const statsMap = new Map<string, UserTrafficStats>();

    let logFiles: string[] = [];

    try {
        // Check if directory exists
        try {
            await fs.access(logsDir);
        } catch {
            // Logs directory doesn't exist, return empty map
            console.warn(`[traffic-parser] Logs directory not found: ${logsDir}`);
            cache = { data: statsMap, timestamp: now };

            return statsMap;
        }

        // Read all log files
        const files = await fs.readdir(logsDir);

        logFiles = files.filter((file) => file.endsWith(".log"));

        for (const file of logFiles) {
            const filePath = path.join(logsDir, file);

            try {
                const content = await fs.readFile(filePath, "utf-8");
                const lines = content.split("\n");

                for (const line of lines) {
                    if (!line.trim()) continue;

                    // Try to parse as JSON first (LogFormat JSON)
                    let parsed: LogEntry = null;

                    try {
                        parsed = JSON.parse(line);
                        // Check if it's a 3proxy JSON log entry
                        if (parsed && parsed.auth && parsed.bytes) {
                            const username = parsed.auth.user || parsed.client?.ip;
                            const sent = parsed.bytes.sent || 0;
                            const received = parsed.bytes.received || 0;

                            if (username && (sent > 0 || received > 0)) {
                                const existing = statsMap.get(username);

                                if (existing) {
                                    statsMap.set(username, {
                                        totalRequests: existing.totalRequests + 1,
                                        totalSent: existing.totalSent + sent,
                                        totalReceived: existing.totalReceived + received
                                    });
                                } else {
                                    statsMap.set(username, {
                                        totalRequests: 1,
                                        totalSent: sent,
                                        totalReceived: received
                                    });
                                }
                                continue;
                            }
                        }
                    } catch {
                        // Not JSON, fall back to text format
                    }

                    // Parse traditional text format: "IP:PORT - - [timestamp] "METHOD PATH HTTP/VERSION" status bytes_sent bytes_received"
                    // Example: "192.168.1.100:8080 - - [24/Mar/2026:12:34:56] "CONNECT google.com:443 HTTP/1.1" 200 1234 5678"
                    const match = line.match(/^(\S+).*?"\S+\s+\S+"\s+(\d+)\s+(\d+)\s+(\d+)/);

                    if (!match) continue;

                    const ipPort = match[1]; // e.g., "192.168.1.100:8080"
                    const sent = parseInt(match[3], 10);
                    const received = parseInt(match[4], 10);

                    // Extract IP without port for key (or use as-is if no port)
                    const key = ipPort.includes(":") ? ipPort.split(":")[0] : ipPort;

                    const existing = statsMap.get(key);

                    if (existing) {
                        statsMap.set(key, {
                            totalRequests: existing.totalRequests + 1,
                            totalSent: existing.totalSent + sent,
                            totalReceived: existing.totalReceived + received
                        });
                    } else {
                        statsMap.set(key, {
                            totalRequests: 1,
                            totalSent: sent,
                            totalReceived: received
                        });
                    }
                }
            } catch (err) {
                console.error(`[traffic-parser] Error reading log file ${filePath}:`, err);
            }
        }
    } catch (err) {
        console.error("[traffic-parser] Error accessing logs directory:", err);
    }

    console.debug(
        `[traffic-parser] Read ${logFiles.length} log file(s) from ${logsDir}, aggregated ${statsMap.size} IPs`
    );
    cache = { data: statsMap, timestamp: now };

    return statsMap;
}

/**
 * Get traffic stats for a specific username/IP
 * This is a convenience wrapper around readTrafficLogs
 */
export async function getUserTraffic(usernameOrIp: string): Promise<UserTrafficStats> {
    const allStats = await readTrafficLogs();

    return (
        allStats.get(usernameOrIp) || {
            totalRequests: 0,
            totalSent: 0,
            totalReceived: 0
        }
    );
}

/**
 * Clear the cache (useful for manual refresh)
 */
export function clearTrafficCache() {
    cache = null;
}
