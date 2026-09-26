/**
 * Helpers for writing authentication events into the 3proxy log.
 * The entry format matches real 3proxy output (see utils/three-proxy-log.ts).
 */
import { getFail2banStatus, type Fail2banStatus } from "../utils/helpers.js";
import { appendLogEntry, buildLogEntry, FAIL2BAN_LOG_PATH } from "../utils/three-proxy-log.js";
import { CONTAINER_NAME, LEGIT_IP, TEST_IP } from "./shared-mocks.js";

export interface AuthLogOptions {
    username?: string;
    ip?: string;
    bytesSent?: number;
    bytesReceived?: number;
    message?: string;
}

/** Writes an entry with error code 407 (auth required) or 403 (forbidden). */
export async function appendAuthFailure(code: "407" | "403", options: AuthLogOptions = {}): Promise<void> {
    const { username = "testuser", ip = TEST_IP, bytesSent = 0, bytesReceived = 0 } = options;

    await appendLogEntry(
        CONTAINER_NAME,
        buildLogEntry({
            user: username,
            errorCode: code,
            clientIp: ip,
            sent: bytesSent,
            received: bytesReceived,
            hostname: "[0.0.0.0]",
            message: options.message ?? (code === "407" ? "407 Proxy Authentication Required" : "403 Forbidden")
        }),
        FAIL2BAN_LOG_PATH
    );
}

/** Writes a successful request entry: fail2ban must ignore it. */
export async function appendSuccess(options: AuthLogOptions = {}): Promise<void> {
    const { username = "legituser", ip = LEGIT_IP, bytesSent = 1024, bytesReceived = 2048 } = options;

    await appendLogEntry(
        CONTAINER_NAME,
        buildLogEntry({
            user: username,
            errorCode: "00000",
            clientIp: ip,
            sent: bytesSent,
            received: bytesReceived,
            hostname: "example.com",
            message: options.message ?? "GET http://example.com/ HTTP/1.1"
        }),
        FAIL2BAN_LOG_PATH
    );
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits for the IP to appear in the ban list, returns the final jail status. */
export async function waitForBan(
    ip: string,
    timeoutMs = 30000
): Promise<{ banned: boolean; status: Fail2banStatus }> {
    const deadline = Date.now() + timeoutMs;
    let status = await getFail2banStatus(CONTAINER_NAME);

    while (Date.now() < deadline) {
        if (status.bannedIPs?.includes(ip)) {
            return { banned: true, status };
        }
        await sleep(2000);
        status = await getFail2banStatus(CONTAINER_NAME);
    }

    return { banned: false, status };
}
