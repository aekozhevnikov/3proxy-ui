import { exec } from "child_process";
import { promisify } from "util";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/src/prisma/db";

const execAsync = promisify(exec);

/**
 * POST /api/admin/users/test-proxy
 * Tests proxy availability for a specific user via SOCKS5 and HTTP
 * Body: { username: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
        }

        // Get user from database (include password and isActive)
        const user = await prisma.proxyUser.findFirst({
            where: { username },
            select: { username: true, password: true, isActive: true, deactivatedAt: true }
        });

        if (!user || !user.password) {
            return NextResponse.json(
                { success: false, error: `User '${username}' not found or has no password set` },
                { status: 404 }
            );
        }

        // Check if user is active
        if (!user.isActive) {
            const reason = user.deactivatedAt
                ? `User was deactivated on ${new Date(user.deactivatedAt).toLocaleString()}`
                : "User is deactivated";

            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot test deactivated user. ${reason}`,
                    deactivated: true,
                    deactivatedAt: user.deactivatedAt
                },
                { status: 403 }
            );
        }

        // Check if 3proxy is running (via Docker or directly)
        let isRunning = false;

        try {
            // First check Docker container (if used)
            const { stdout: dockerPs } = await execAsync(
                "docker ps --filter 'name=3proxy' --format '{{.Names}}' 2>/dev/null"
            );

            if (dockerPs.trim()) {
                isRunning = true;
            } else {
                // Otherwise check local process
                await execAsync("pgrep -x 3proxy");
                isRunning = true;
            }
        } catch {
            return NextResponse.json({ success: false, error: "3proxy service is not running" }, { status: 503 });
        }

        if (!isRunning) {
            return NextResponse.json({ success: false, error: "3proxy service is not running" }, { status: 503 });
        }

        // Get proxy ports. In Docker container 3proxy typically uses one port
        // Try to get info from system status or use defaults
        let socks5Port: number | null = null;
        let httpPort: number | null = null;
        let proxyHost = "127.0.0.1";

        try {
            // Try to get system status via local API
            const { stdout: statusJson } = await execAsync(
                "curl -s --connect-timeout 2 http://localhost:3000/api/system/status 2>/dev/null || echo '{}'"
            );
            const statusData = JSON.parse(statusJson);

            if (statusData?.proxyPort) {
                // In 3proxy typically one port for all protocols
                const port = statusData.proxyPort;

                socks5Port = port;
                httpPort = port;
                proxyHost = statusData.bindAddress || "127.0.0.1";
            }
        } catch (error) {
            console.error(error);
        }

        // If couldn't get from API, try default ports
        if (!socks5Port) {
            socks5Port = 1080;
        }
        if (!httpPort) {
            httpPort = 3128; // May match socks5 if single port
        }

        // Store protocol information
        const protocols: Array<{ protocol: string; port: number }> = [];

        if (socks5Port) protocols.push({ protocol: "socks5", port: socks5Port });
        if (httpPort && httpPort !== socks5Port) protocols.push({ protocol: "http", port: httpPort });

        // Build URL with authentication
        const authString = `${encodeURIComponent(user.username)}:${encodeURIComponent(user.password)}`;

        // Test connection via curl (with authentication)
        const testPromises = protocols.map((p) =>
            execAsync(
                `curl -s ${p.protocol === "socks5" ? `--socks5 ${authString}@${proxyHost}:${p.port}` : `-x http://${authString}@${proxyHost}:${p.port}`} http://example.com --max-time 5`,
                { timeout: 6000 }
            )
                .then(() => ({ protocol: p.protocol, success: true }))
                .catch((err: Error) => ({ protocol: p.protocol, success: false, error: err.message }))
        );

        const results = await Promise.allSettled(testPromises);
        const tests: Array<{ protocol: string; success: boolean; error?: string }> = [];

        for (let i = 0; i < results.length; i++) {
            const result = results[i];

            if (result.status === "fulfilled") {
                tests.push(result.value as { protocol: string; success: boolean; error?: string });
            } else {
                tests.push({ protocol: protocols[i].protocol, success: false, error: "Test failed" });
            }
        }

        const allSuccess = tests.every((t) => t.success);
        const anySuccess = tests.some((t) => t.success);

        return NextResponse.json({
            success: anySuccess,
            message: allSuccess
                ? `Proxy test successful for user ${username} (SOCKS5 & HTTP)`
                : anySuccess
                  ? `Proxy test partially successful for user ${username} (some protocols failed)`
                  : `Proxy test failed for user ${username}`,
            data: {
                username,
                tests: tests.reduce(
                    (acc, test) => {
                        acc[test.protocol] = test;

                        return acc;
                    },
                    {} as Record<string, { protocol: string; success: boolean; error?: string }>
                ),
                proxyConfig: {
                    host: proxyHost,
                    socks5Port,
                    httpPort
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Error testing proxy:", error);

        return NextResponse.json({ success: false, error: "Failed to test proxy" }, { status: 500 });
    }
}
