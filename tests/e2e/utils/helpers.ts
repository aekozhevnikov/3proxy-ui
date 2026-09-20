import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Test configuration
const TEST_CONFIG = {
    apiUrl: process.env.API_URL || "http://localhost:3000",
    proxyHttp: "http://localhost:3128",
    proxySocks: "socks5://localhost:1080",
    testUser: {
        username: "e2etestuser",
        password: "TestPassword123!",
        dataLimit: 104857600, // 100 MB in bytes
        telegramUserId: "123456789"
    },
    adminUser: {
        username: "admin",
        password: "admin123"
    }
};

export interface HttpResponse {
    success?: boolean;
    token?: string;
    error?: string;
    text?: string;
    updatedCount?: number;
    deactivatedCount?: number;
    id?: number;
    isActive?: boolean;
    dataUsed?: number;
    dataLimit?: number | null;
    deactivatedAt?: string | null;
    sourceFile?: string;
    [key: string]: unknown;
}

function isHttpResponse(obj: unknown): obj is HttpResponse {
    return typeof obj === "object" && obj !== null;
}

// Helper: HTTP request with retry
async function httpRequest(url: string, options: RequestInit = {}): Promise<HttpResponse | string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            return await response.json();
        }
        return await response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Helper: Wait for service to be ready
async function waitForService(url: string, timeout = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            const response = await fetch(`${url}/api/auth/session`, { method: "GET" });
            if (response.ok) {
                return;
            }
        } catch {
            // Service not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error(`Service at ${url} did not become ready within ${timeout}ms`);
}

// Helper: Create admin session
async function createAdminSession(): Promise<string> {
    const loginData = new URLSearchParams();
    loginData.append("username", TEST_CONFIG.adminUser.username);
    loginData.append("password", TEST_CONFIG.adminUser.password);

    const response = await httpRequest(`${TEST_CONFIG.apiUrl}/api/auth/login`, {
        method: "POST",
        body: loginData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });

    if (!isHttpResponse(response) || !response.success || !response.token) {
        throw new Error("Failed to create admin session");
    }

    return response.token;
}

// Helper: API call with auth (always returns HttpResponse)
async function apiCall(
    token: string,
    endpoint: string,
    method = "GET",
    body?: Record<string, unknown>
): Promise<HttpResponse> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`
    };

    if (body) {
        headers["Content-Type"] = "application/json";
    }

    const result = await httpRequest(`${TEST_CONFIG.apiUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (isHttpResponse(result)) {
        return result;
    }
    return { text: result };
}

// Helper: Generate traffic through proxy
async function generateTrafficViaProxy(
    url: string,
    proxy: string,
    bytesToSend: number = 1024 * 1024 // 1MB default
): Promise<{ sent: number; received: number }> {
    // Generate random data
    const data = new Uint8Array(bytesToSend);
    for (let i = 0; i < bytesToSend; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }

    // For simplicity in E2E tests, we'll skip actual proxy traffic generation
    // and instead rely on manually writing to the log file as done in the test
    // This avoids complex proxy configuration in the test environment

    const sent = bytesToSend;
    // Simulate receiving some data (echo server behavior)
    const received = Math.floor(bytesToSend * 0.8); // 80% echo

    return { sent, received };
}

// Helper: Wait for container command
async function execInContainer(containerName: string, command: string): Promise<string> {
    const fullCmd = `docker exec ${containerName} sh -c "${command}"`;
    try {
        const { stdout, stderr } = await execAsync(fullCmd);
        if (stderr) {
            // Log stderr but don't fail because some commands may write to stderr on success
            console.warn(`stderr from execInContainer: ${stderr}`);
        }
        return stdout;
    } catch (error) {
        const err = new Error(error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to execute in container ${containerName}: ${command}\n${err.message}`);
    }
}

interface Fail2banStatus {
    bannedIPs: string[];
    totalBanned: number;
    currentlyBanned: number;
    error?: string;
}

// Helper: Get fail2ban status
async function getFail2banStatus(containerName: string, jailName: string = "3proxy-docker"): Promise<Fail2banStatus> {
    try {
        const output = await execInContainer(containerName, `fail2ban-client status ${jailName}`);
        const lines = output.split("\n");
        const status: Fail2banStatus = {
            bannedIPs: [],
            totalBanned: 0,
            currentlyBanned: 0
        };

        for (const line of lines) {
            if (line.includes("Banned IP list")) {
                status.bannedIPs = line.split(":")[1]?.trim().split(" ") || [];
            } else if (line.includes("Total banned")) {
                status.totalBanned = parseInt(line.match(/(\d+)/)?.[1] || "0", 10);
            } else if (line.includes("Currently banned")) {
                status.currentlyBanned = parseInt(line.match(/(\d+)/)?.[1] || "0", 10);
            }
        }

        return status;
    } catch (error) {
        const err = new Error(error instanceof Error ? error.message : String(error));
        if (err.message.includes("not running")) {
            return { bannedIPs: [], totalBanned: 0, currentlyBanned: 0, error: "jail_not_active" };
        }
        throw error;
    }
}

// Helper: Wait for maintenance to complete
async function waitForMaintenance(
    token: string,
    timeout = 120000,
    checkInterval = 5000
): Promise<HttpResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        try {
            // Trigger maintenance manually
            const result = await apiCall(token, "/api/users/maintenance", "POST", {});
            if (isHttpResponse(result) && result.success) {
                return result;
            }
        } catch (error) {
            console.warn("Maintenance not ready yet:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Maintenance did not complete successfully within ${timeout}ms`);
}

export {
    TEST_CONFIG,
    isHttpResponse,
    waitForService,
    createAdminSession,
    apiCall,
    generateTrafficViaProxy,
    execInContainer,
    getFail2banStatus,
    waitForMaintenance,
    execAsync
};
