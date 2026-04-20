import path from "path";
import fs from "fs";

interface LogEntry {
    time_unix: number;
    proxy: {
        type: string;
        port: number;
    };
    error: {
        code: string;
    };
    auth: {
        user: string;
    };
    client: {
        ip: string;
        port: number;
    };
    server: {
        ip: string;
        port: number;
    };
    bytes: {
        sent: number;
        received: number;
    };
    request: {
        hostname: string;
    };
    message: string;
    raw: string;
}

interface LogFilter {
    startDate?: string;
    endDate?: string;
    username?: string;
    logType?: "all" | "PROXY" | "SOCKS" | "ADMIN";
    limit?: number;
    offset?: number;
}

const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), "3proxy", "logs");

function parseLogLine(line: string): LogEntry | null {
    try {
        // The log format is JSONL - each line is a JSON object
        const parsed = JSON.parse(line) as LogEntry;

        return {
            ...parsed,
            raw: line
        };
    } catch (error) {
        console.error("Failed to parse log line:", error, "Line:", line.substring(0, 100));

        return null;
    }
}

function getLogFiles(dateRange?: { start?: string; end?: string }): string[] {
    const files: string[] = [];

    try {
        if (!fs.existsSync(LOGS_DIR)) {
            console.warn("Logs directory does not exist:", LOGS_DIR);

            return files;
        }

        const allFiles = fs.readdirSync(LOGS_DIR).filter((f: string) => f.startsWith("3proxy.log."));

        // Sort by date (newest first)
        allFiles.sort().reverse();

        // Filter by date range if provided
        if (dateRange?.start || dateRange?.end) {
            return allFiles.filter((filename: string) => {
                // Extract date from filename: 3proxy.log.2026.03.23
                const parts = filename.split(".");

                if (parts.length < 4) return false;

                const [year, month, day] = parts.slice(1, 4);
                const fileDate = `${year}-${month}-${day}`;

                if (dateRange.start && fileDate < dateRange.start) return false;
                if (dateRange.end && fileDate > dateRange.end) return false;

                return true;
            });
        }

        return allFiles;
    } catch (error) {
        console.error("Error reading log directory:", error);

        return files;
    }
}

function readLogFile(filePath: string): string[] {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn("Log file does not exist:", filePath);

            return [];
        }

        const content = fs.readFileSync(filePath, "utf8");

        return content.split("\n").filter((line: string) => line.trim().length > 0);
    } catch (error) {
        console.error("Error reading log file:", error, filePath);

        return [];
    }
}

function applyFilters(entries: LogEntry[], filter: LogFilter): LogEntry[] {
    return entries.filter((entry) => {
        // Filter by log type
        if (filter.logType && filter.logType !== "all" && entry.proxy.type !== filter.logType) {
            return false;
        }

        // Filter by username
        if (filter.username && filter.username.trim().length > 0) {
            if (!entry.auth.user || entry.auth.user !== filter.username) {
                return false;
            }
        }

        // Filter by date range (based on timestamp)
        if (filter.startDate || filter.endDate) {
            const entryDate = new Date(entry.time_unix * 1000).toISOString().split("T")[0];

            if (filter.startDate && entryDate < filter.startDate) return false;
            if (filter.endDate && entryDate > filter.endDate) return false;
        }

        return true;
    });
}

export async function getLogs(filter: LogFilter = {}): Promise<{
    entries: LogEntry[];
    total: number;
    filesScanned: number;
}> {
    const entries: LogEntry[] = [];
    const files = getLogFiles({
        start: filter.startDate,
        end: filter.endDate
    });

    const limit = filter.limit || 1000;
    const offset = filter.offset || 0;
    let collected = 0;

    for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const lines = readLogFile(filePath);

        // Process lines in reverse order (newest first) since files are sorted newest first
        for (let i = lines.length - 1; i >= 0; i--) {
            const entry = parseLogLine(lines[i]);

            if (!entry) continue;

            // Check if entry matches filters
            if (!applyFilters([entry], filter)[0]) continue;

            collected++;
            // Skip if before offset
            if (collected <= offset) continue;

            entries.push(entry);

            if (entries.length >= limit) break;
        }

        if (entries.length >= limit) break;
    }

    return {
        entries,
        total: collected,
        filesScanned: files.length
    };
}

export async function getAvailableLogDates(): Promise<string[]> {
    const files = getLogFiles();
    const dates = new Set<string>();

    for (const file of files) {
        const parts = file.split(".");

        if (parts.length >= 4) {
            const [year, month, day] = parts.slice(1, 4);

            dates.add(`${year}-${month}-${day}`);
        }
    }

    return Array.from(dates).sort().reverse();
}

export async function getLogStats(): Promise<{
    totalLogs: number;
    dateRange: {
        earliest: string | null;
        latest: string | null;
    };
    files: number;
    size: number;
}> {
    const files = getLogFiles();

    if (files.length === 0) {
        return {
            totalLogs: 0,
            dateRange: { earliest: null, latest: null },
            files: 0,
            size: 0
        };
    }

    let totalLogs = 0;
    let totalSize = 0;
    const dates: string[] = [];

    for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);

        try {
            const stat = fs.statSync(filePath);

            totalSize += stat.size;

            const lines = readLogFile(filePath);

            totalLogs += lines.length;

            // Extract date
            const parts = file.split(".");

            if (parts.length >= 4) {
                const [year, month, day] = parts.slice(1, 4);

                dates.push(`${year}-${month}-${day}`);
            }
        } catch (error) {
            console.error("Error processing log file:", file, error);
        }
    }

    dates.sort();

    return {
        totalLogs,
        dateRange: {
            earliest: dates[0] || null,
            latest: dates[dates.length - 1] || null
        },
        files: files.length,
        size: totalSize
    };
}

export function formatLogDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
