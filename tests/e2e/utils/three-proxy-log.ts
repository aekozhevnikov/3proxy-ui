/**
 * 3proxy log entries in the format from logformat in 3proxy/3proxy.cfg:
 *
 *   {"time_unix":%t, "proxy":{"type:":"%N","port":%p}, "error":{"code":"%E"},
 *    "auth":{"user":"%U"}, "client":{"ip":"%C","port":%c},
 *    "server":{"ip":"%R","port":%r}, "bytes":{"sent":%O, "received":%I},
 *    "request":{"hostname":"%n"}, "message":"%T"}
 *
 * The proxy field is named "type:" with a colon; the traffic parser ignores
 * it, but log-parser filters on it, so we write it as the config does.
 */
import { LOGS_CONTAINER_DIR } from "./environment.js";
import { execInContainer } from "./helpers.js";

export interface ThreeProxyLogEntry {
    timeUnix: number;
    proxyType: "PROXY" | "SOCKS" | "ADMIN";
    port: number;
    errorCode?: string;
    user: string;
    clientIp: string;
    clientPort: number;
    serverIp: string;
    serverPort: number;
    sent: number;
    received: number;
    hostname: string;
    message: string;
}

export function buildLogEntry(partial: Partial<ThreeProxyLogEntry> & { user: string }): ThreeProxyLogEntry {
    return {
        timeUnix: Math.floor(Date.now() / 1000),
        proxyType: "PROXY",
        port: 3128,
        errorCode: "00000",
        clientIp: "203.0.113.200",
        clientPort: 40000,
        serverIp: "93.184.216.34",
        serverPort: 80,
        sent: 0,
        received: 0,
        hostname: "example.com",
        message: "GET http://example.com/ HTTP/1.1",
        ...partial
    };
}

export function serializeLogEntry(entry: ThreeProxyLogEntry): string {
    return JSON.stringify({
        time_unix: entry.timeUnix,
        proxy: { "type:": entry.proxyType, port: entry.port },
        error: { code: entry.errorCode ?? "00000" },
        auth: { user: entry.user },
        client: { ip: entry.clientIp, port: entry.clientPort },
        server: { ip: entry.serverIp, port: entry.serverPort },
        bytes: { sent: entry.sent, received: entry.received },
        request: { hostname: entry.hostname },
        message: entry.message
    });
}

/**
 * The file 3proxy is writing to right now.
 *
 * On start with the `D` rotation flag 3proxy renames 3proxy.log to
 * 3proxy.log.YYYY.MM.DD and keeps writing into the renamed file, while the
 * new 3proxy.log stays empty. Picking the "newest by mtime" lies here: the
 * empty file is newer. So the active file is identified by a marker -
 * only it contains the 3proxy startup line "Accepting connections".
 */
export async function activeLogFile(container: string): Promise<string> {
    const output = await execInContainer(
        container,
        `grep -l "Accepting connections" ${LOGS_CONTAINER_DIR}/3proxy.log* 2>/dev/null | head -1`
    );

    const match = output.trim().split("\n")[0];

    if (match) {
        return match;
    }

    const fallback = await execInContainer(container, `ls -t ${LOGS_CONTAINER_DIR}/3proxy.log* 2>/dev/null | head -1`);

    return fallback.trim() || `${LOGS_CONTAINER_DIR}/3proxy.log`;
}

/**
 * Appends an entry to the container log.
 *
 * By default - to the active 3proxy file. For fail2ban an explicit target is
 * needed: the jail in entrypoint.sh is hardcoded to
 * `logpath = /etc/3proxy/logs/3proxy.log`, and after rotation 3proxy keeps
 * writing into the renamed file, which the jail does not read.
 */
export async function appendLogEntry(container: string, entry: ThreeProxyLogEntry, targetFile?: string): Promise<void> {
    // Creating and deleting a user restarts 3proxy, and it writes its startup
    // lines only after the API call returns. Wait for them, otherwise 3proxy
    // becomes the newest file again and maintenance reads the wrong one.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const line = serializeLogEntry(entry);
    const target = targetFile ?? (await activeLogFile(container));

    // The entry starts with a newline. 3proxy writes to this file in parallel
    // and may hold a half-written line; without a separator the entry would be
    // glued to it and the whole JSON would not parse, silently losing the
    // test traffic.
    await execInContainer(container, `mkdir -p ${LOGS_CONTAINER_DIR} && printf '\\n%s\\n' '${line}' >> ${target}`);

    // Bump mtime: maintenance picks the newest file, and the entry has to be
    // in it rather than in whatever 3proxy appended after us.
    await execInContainer(container, `touch ${target}`);
}

/** Path the fail2ban jail watches (matches logpath in entrypoint.sh). */
export const FAIL2BAN_LOG_PATH = `${LOGS_CONTAINER_DIR}/3proxy.log`;

/**
 * Reads the active log of the container.
 *
 * One file, not all 3proxy.log*: maintenance also reads a single newest
 * file, and the test expectations must be computed from the same data that
 * ends up in dataUsed.
 */
export async function readRuntimeLog(container: string): Promise<string> {
    const target = await activeLogFile(container);

    return execInContainer(container, `cat ${target} 2>/dev/null || true`);
}
