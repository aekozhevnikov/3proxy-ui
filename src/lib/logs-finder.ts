import { promises as fs } from "fs";

const POSSIBLE_LOGS_DIRS = [process.env.LOGS_DIR, "/var/log/3proxy", "./logs", "./3proxy/logs"] as const;

let cachedLogsDir: string | null = null;

export async function findLogsDir(): Promise<string | null> {
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
            /* empty */
        }
    }

    console.error(`[maintenance] No logs directory with .log files found`);

    return null;
}

export function clearLogsDirCache() {
    cachedLogsDir = null;
}
