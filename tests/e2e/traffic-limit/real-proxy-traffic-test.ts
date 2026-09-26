/**
 * E2E Test: Real Proxy Traffic
 *
 * End-to-end path instead of synthetic log lines: real requests through 3proxy,
 * entries in the log written by 3proxy itself, then dataUsed in the database.
 */
import { generateHttpTraffic, startLocalTarget } from "../utils/proxy-traffic-generator.js";
import { containerIp, dumpTrafficState } from "../utils/environment.js";
import { readRuntimeLog } from "../utils/three-proxy-log.js";
import { apiCall, createAdminSession } from "../utils/helpers.js";
import { parseTrafficLogs } from "../../../src/lib/traffic-parser.js";
import { CONTAINER_NAME, removeUserIfExists, UserApiClient } from "./shared-setup.js";

const USERNAME = "realtrafficuser";
const PASSWORD = "RealTraffic123!";

// 3proxy resolves hosts through its own n-servers rather than Docker DNS,
// so the proxy target has to be addressed by container IP.
const PROXY_HOST = "3proxy-e2e-3proxy";
const PROXY_PORT = 3128;
const TARGET_PORT = 8099;
const TARGET_RESPONSE_BYTES = 64 * 1024;
const REQUEST_COUNT = 3;
const REQUEST_BYTES = 32 * 1024;

export async function testRealProxyTraffic(): Promise<void> {
    const users = new UserApiClient();

    await removeUserIfExists(users, USERNAME);

    const created = await users.createUser({
        username: USERNAME,
        password: PASSWORD,
        dataLimit: null,
        ipLimit: 0,
        isActive: true
    });

    // A new user lands in .proxyauth on creation, but 3proxy reads the file
    // only on start, so the container has to be restarted.
    await reloadConfig();

    await startLocalTarget(CONTAINER_NAME, {
        port: TARGET_PORT,
        responseBytes: TARGET_RESPONSE_BYTES
    });

    const targetIp = await containerIp(CONTAINER_NAME);

    const stats = await generateHttpTraffic({
        container: CONTAINER_NAME,
        proxyHost: PROXY_HOST,
        proxyPort: PROXY_PORT,
        targetUrl: `http://${targetIp}:${TARGET_PORT}/`,
        credentials: { username: USERNAME, password: PASSWORD },
        requestCount: REQUEST_COUNT,
        requestBytes: REQUEST_BYTES
    });

    if (stats.requests !== REQUEST_COUNT) {
        throw new Error(`Expected ${REQUEST_COUNT} successful requests, got ${stats.requests}`);
    }
    if (stats.sent < REQUEST_BYTES * REQUEST_COUNT) {
        throw new Error(`Proxy reported too little uploaded traffic: ${stats.sent} bytes`);
    }

    const expectedSent = REQUEST_BYTES * REQUEST_COUNT;
    const expectedReceived = TARGET_RESPONSE_BYTES * REQUEST_COUNT;

    // 3proxy writes the log asynchronously relative to curl returning, so wait
    // for the entry to appear instead of reading the file once.
    const deadline = Date.now() + 15000;
    let logContent = "";
    let fromLog: { sent: number; received: number; requests: number } | undefined;

    while (Date.now() < deadline) {
        logContent = await readRuntimeLog(CONTAINER_NAME);
        fromLog = parseTrafficLogs(logContent.split("\n")).trafficMap.get(USERNAME);

        if (fromLog && fromLog.sent >= expectedSent && fromLog.received >= expectedReceived) {
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!fromLog) {
        throw new Error(`3proxy did not log any entry for ${USERNAME}. Log tail:\n${logContent.slice(-2000)}`);
    }
    if (fromLog.sent < expectedSent) {
        throw new Error(`3proxy logged less uploaded traffic than was sent: ${fromLog.sent} < ${expectedSent}`);
    }
    if (fromLog.received < expectedReceived) {
        throw new Error(
            `3proxy logged less downloaded traffic than was sent: ${fromLog.received} < ${expectedReceived}`
        );
    }

    await users.triggerMaintenance();

    const after = await users.getUser(created.id);
    const expected = fromLog.sent + fromLog.received;

    if (after.dataUsed < expected) {
        throw new Error(
            `dataUsed ${after.dataUsed} does not reflect logged traffic ${expected} for ${USERNAME}.\n` +
                `${await dumpTrafficState(CONTAINER_NAME)}`
        );
    }
}

async function reloadConfig(): Promise<void> {
    const token = await createAdminSession();
    const result = await apiCall(token, "/api/config/reload", "POST");

    if (!result.success) {
        throw new Error(`Config reload failed: ${result.error}`);
    }

    // Restarting the 3proxy container takes a few seconds.
    await new Promise((resolve) => setTimeout(resolve, 5000));
}
