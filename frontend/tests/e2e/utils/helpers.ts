import { exec } from "child_process";

// Image build and compose output easily exceed the default 1 MB maxBuffer,
// which makes exec fail with ECONNRESET/ENOBUFS on long output.
const execAsync = (command: string): Promise<{ stdout: string; stderr: string }> =>
    new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);

                return;
            }

            resolve({ stdout, stderr });
        });
    });

// Test configuration
const TEST_CONFIG = {
    apiUrl: process.env.API_URL || "http://localhost:3000",
    proxyHttp: "http://localhost:3128",
    proxySocks: "socks5://localhost:1080",
    testUser: {
        username: "e2etestuser",
        password: "TestPassword123!",
        dataLimit: 100, // The dataLimit field is stored in MB (see user-form.ts)
        telegramUserId: "123456789"
    },
    expiredUser: {
        username: "expiredtestuser",
        password: "TestPassword123!",
        dataLimit: 100,
        telegramUserId: "123456790"
    },
    adminUser: {
        username: "admin",
        password: "admin"
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
// The app authenticates with a cookie session (currentSession() reads the
// "session" cookie), so login returns the JWT in Set-Cookie, not in the body.
async function createAdminSession(): Promise<string> {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: TEST_CONFIG.adminUser.username,
            password: TEST_CONFIG.adminUser.password
        }),
        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        throw new Error(`Admin login failed with status ${response.status}`);
    }

    const sessionCookie = response.headers.get("set-cookie")?.match(/session=([^;]+)/)?.[1];

    if (!sessionCookie) {
        throw new Error("Login succeeded but no session cookie was returned");
    }

    return sessionCookie;
}

// Helper: API call with auth (always returns HttpResponse)
async function apiCall(
    token: string,
    endpoint: string,
    method = "GET",
    body?: Record<string, unknown>
): Promise<HttpResponse> {
    const headers: Record<string, string> = {
        Cookie: `session=${token}`
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

// Helper: Wait for container command
async function execInContainer(containerName: string, command: string): Promise<string> {
    const fullCmd = `docker exec ${containerName} sh -c "${encodeCommand(command)}"`;
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

// Commands embed 3proxy log JSON with double quotes, so they cannot be
// inlined into sh -c "..." - nested escaping breaks parsing.
// Pass the command in base64 and decode it inside the container.
function encodeCommand(command: string): string {
    const encoded = Buffer.from(command, "utf-8").toString("base64");

    return `echo ${encoded} | base64 -d | sh`;
}

// Helper: Run a command in the background inside the container
async function execInContainerDetached(containerName: string, command: string): Promise<void> {
    await execAsync(`docker exec -d ${containerName} sh -c "${encodeCommand(command)}"`);
}

export interface Fail2banStatus {
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

export {
    TEST_CONFIG,
    isHttpResponse,
    waitForService,
    createAdminSession,
    apiCall,
    execInContainer,
    execInContainerDetached,
    getFail2banStatus,
    execAsync
};
