import { CONTAINER_NAME, TEST_IP, LEGIT_IP } from "./shared-mocks.js";
import { execInContainer } from "./shared-mocks.js";

export const LOG_DIR = "/etc/3proxy/logs";

export function createLogEntries(code: string, options?: {
    username?: string;
    ip?: string;
    bytesSent?: number;
    bytesReceived?: number;
    message?: string;
}) {
    const { username = "testuser", ip = TEST_IP, bytesSent = 0, bytesReceived = 0, message = code === "407" ? "Proxy authentication required" : "Forbidden" } = options || {};
    const entry = JSON.stringify({
        time_unix: Math.floor(Date.now() / 1000),
        proxy: { "type:": "HTTP", port: 3128 },
        error: { code },
        auth: { user: username },
        client: { ip, port: 12345 },
        server: { ip: "93.158.167.115", port: 443 },
        bytes: { sent: bytesSent, received: bytesReceived },
        request: { hostname: message === "OK" ? "example.com" : "" },
        message,
    }) + "\n";
    return entry;
}

export async function appendLog(code: string, options?: {
    username?: string;
    ip?: string;
    bytesSent?: number;
    bytesReceived?: number;
    message?: string;
}) {
    await execInContainer(CONTAINER_NAME, `sh -c "echo '${createLogEntries(code, options)}' >> ${LOG_DIR}/3proxy.log"`);
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}