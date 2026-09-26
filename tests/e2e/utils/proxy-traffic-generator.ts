/**
 * Traffic generation through the real 3proxy proxy.
 *
 * Instead of writing synthetic log lines, a local target is started and
 * real requests are made through 3proxy from inside the container. The test
 * then covers the whole path: request -> bytes in the log -> dataUsed in the DB.
 *
 * Node.js fetch cannot do proxying, so curl makes the requests and the target
 * server is a plain http module with no dependencies.
 */
import { execInContainer, execInContainerDetached } from "./helpers.js";

export interface ProxyTrafficStats {
    sent: number;
    received: number;
    requests: number;
    duration: number;
}

export interface ProxyCredentials {
    username: string;
    password: string;
}

// The script is passed to the container in base64: it contains quotes and
// newlines that cannot be safely inlined into sh -c "...".
const TARGET_SERVER_SCRIPT = `
const http = require("http");
const PORT = process.env.TARGET_PORT;
const RESPONSE_BYTES = parseInt(process.env.RESPONSE_BYTES || "65536", 10);
const BODY = Buffer.alloc(RESPONSE_BYTES, 0x61);

http
    .createServer((req, res) => {
        let received = 0;
        req.on("data", (chunk) => {
            received += chunk.length;
        });
        req.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": RESPONSE_BYTES });
            res.end(BODY);
        });
    })
    .listen(PORT, "0.0.0.0", () => {
        console.log("target listening on " + PORT);
    });
`;

export interface LocalTargetOptions {
    port: number;
    responseBytes: number;
}

/** Starts a local HTTP target server inside the container. */
export async function startLocalTarget(container: string, options: LocalTargetOptions): Promise<void> {
    const encoded = Buffer.from(TARGET_SERVER_SCRIPT, "utf-8").toString("base64");

    await execInContainer(container, `echo '${encoded}' | base64 -d > /tmp/e2e-target.js`);

    await execInContainerDetached(
        container,
        `TARGET_PORT=${options.port} RESPONSE_BYTES=${options.responseBytes} node /tmp/e2e-target.js > /tmp/e2e-target.log 2>&1`
    );

    // The server comes up instantly, but give it a second and probe it.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const probe = await execInContainer(
        container,
        `curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:${options.port}/ || echo 000`
    );

    if (probe.trim() !== "200") {
        const targetLog = await execInContainer(container, "cat /tmp/e2e-target.log 2>/dev/null || true");

        throw new Error(
            `Local target did not start on port ${options.port} (probe: ${probe.trim()}). Log:\n${targetLog}`
        );
    }
}

export interface HttpTrafficOptions {
    container: string;
    proxyHost: string;
    proxyPort: number;
    targetUrl: string;
    credentials: ProxyCredentials;
    requestCount?: number;
    requestBytes?: number;
}

/**
 * Sends requestCount POST requests through the proxy and returns the bytes
 * actually transferred (from curl's counters).
 */
export async function generateHttpTraffic(options: HttpTrafficOptions): Promise<ProxyTrafficStats> {
    const {
        container,
        proxyHost,
        proxyPort,
        targetUrl,
        credentials,
        requestCount = 5,
        requestBytes = 32 * 1024
    } = options;

    const proxyUrl = `http://${proxyHost}:${proxyPort}`;
    const auth = `${credentials.username}:${credentials.password}`;

    await execInContainer(container, `head -c ${requestBytes} /dev/zero > /tmp/e2e-payload.bin`);

    const startTime = Date.now();
    let sent = 0;
    let received = 0;
    let requests = 0;

    for (let i = 0; i < requestCount; i++) {
        const output = await execInContainer(
            container,
            `curl -s -o /dev/null -w '%{size_upload} %{size_download} %{http_code}' --max-time 10 ` +
                `-x ${proxyUrl} --proxy-user '${auth}' ` +
                `-H 'Content-Type: application/octet-stream' ` +
                `--data-binary @/tmp/e2e-payload.bin ${targetUrl}`
        );

        const [upload = "0", download = "0", status = "000"] = output.trim().split(/\s+/);

        if (status !== "200") {
            throw new Error(`Request ${i + 1}/${requestCount} through proxy failed with status ${status}: ${output}`);
        }

        sent += Number(upload);
        received += Number(download);
        requests++;
    }

    return { sent, received, requests, duration: Date.now() - startTime };
}
