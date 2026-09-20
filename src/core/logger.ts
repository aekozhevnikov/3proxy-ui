type LogLevel = "debug" | "info" | "warn" | "error";

const VALID_LOG_LEVELS: ReadonlySet<string> = new Set(["debug", "info", "warn", "error"]);
const rawLogLevel: string | undefined = process.env.LOG_LEVEL;

function isLogLevel(value: string): value is LogLevel {
    return VALID_LOG_LEVELS.has(value);
}

function parseLogLevel(value: string | undefined): LogLevel {
    if (value && isLogLevel(value)) {
        return value;
    }

    return "info";
}

const LOG_LEVEL: LogLevel = parseLogLevel(rawLogLevel);

function shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

    return levels[level] >= levels[LOG_LEVEL];
}

export const logger = {
    debug: (..._args: unknown[]) => {
        if (shouldLog("debug")) {
            console.debug(..._args);
        }
    },
    info: (..._args: unknown[]) => {
        if (shouldLog("info")) {
            console.info(..._args);
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
