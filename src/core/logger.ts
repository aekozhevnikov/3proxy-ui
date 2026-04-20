type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

    return levels[level] >= levels[LOG_LEVEL];
}

export const logger = {
    debug: (...args: unknown[]) => {
        if (shouldLog("debug")) {
            console.log(...args);
        }
    },
    info: (...args: unknown[]) => {
        if (shouldLog("info")) {
            console.log(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (shouldLog("warn")) {
            console.warn(...args);
        }
    },
    error: (...args: unknown[]) => {
        if (shouldLog("error")) {
            console.error(...args);
        }
    }
};
