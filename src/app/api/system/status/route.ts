import { exec as execCb } from "child_process";
import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

// Promisified exec
const exec = (cmd: string): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execCb(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
};

// Helper to check if directory exists and get stats
async function getDirectoryStats(dirPath: string): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                const subStats = await getDirectoryStats(fullPath);

                totalSize += subStats.totalSize;
                fileCount += subStats.fileCount;
            } else {
                const stat = await fs.stat(fullPath);

                totalSize += stat.size;
                fileCount++;
            }
        }
    } catch {
        // Ignore errors
    }

    return { totalSize, fileCount };
}

// Helper to parse Docker memory usage (e.g., "1.234MiB", "2.5GiB", "512kB") to bytes
function parseDockerMemory(memStr: string): number {
    const match = memStr.match(/^([\d.]+)\s*(.+)$/);

    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers: Record<string, number> = {
        b: 1,
        k: 1024,
        m: 1024 * 1024,
        g: 1024 * 1024 * 1024,
        ki: 1024,
        mi: 1024 * 1024,
        gi: 1024 * 1024 * 1024
    };

    // Extract the unit part (may have B or iB suffix)
    const baseUnit = unit.replace(/b$/, "").toLowerCase();
    const multiplier = multipliers[baseUnit] || 1;

    return Math.round(value * multiplier);
}

// Helper to extract version tag from Docker image name
function extractImageTag(imageName: string): string {
    // Format can be: "3proxy/3proxy:0.9.5" or "3proxy:latest" or "registry/image:tag"
    const parts = imageName.split(":");

    if (parts.length >= 2) {
        return parts[parts.length - 1];
    }

    // If no tag, return the last part of repository name
    const nameParts = imageName.split("/");

    return nameParts[nameParts.length - 1];
}

async function get3proxyPid(): Promise<number | null> {
    try {
        const { stdout } = await exec("pgrep -x 3proxy");
        const lines = stdout
            .trim()
            .split("\n")
            .filter((line: string) => line.length > 0);

        return lines.length > 0 ? parseInt(lines[0]) : null;
    } catch {
        return null;
    }
}

async function get3proxyPidFromDocker(containerId: string): Promise<number | null> {
    try {
        // Get the host PID of the container (the PID of the container process on the host)
        const { stdout } = await exec(`docker inspect --format '{{.State.Pid}}' ${containerId}`);
        const pid = parseInt(stdout.trim());

        return isNaN(pid) ? null : pid;
    } catch {
        return null;
    }
}

async function find3proxyContainer(): Promise<{ id: string; name: string } | null> {
    try {
        // Try to find 3proxy container
        const { stdout } = await exec("docker ps --filter 'name=3proxy' --format '{{.ID}}\t{{.Names}}' | head -1");

        const parts = stdout.trim().split("\t");

        if (parts[0] && parts[0].length > 0) {
            return { id: parts[0], name: parts[1] || "3proxy" };
        }

        // Try alternative name patterns
        const { stdout: stdout2 } = await exec(
            "docker ps --filter 'name=vpn-3proxy' --format '{{.ID}}\t{{.Names}}' | head -1"
        );
        const parts2 = stdout2.trim().split("\t");

        if (parts2[0] && parts2[0].length > 0) {
            return { id: parts2[0], name: parts2[1] || "vpn-3proxy" };
        }

        return null;
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        // Check if 3proxy process is running (on host or in Docker)
        let is3proxyRunning = false;
        let pid: number | null = null;
        let containerInfo: { id: string; name: string } | null = null;

        // First, try to find directly running 3proxy process
        try {
            await exec("pgrep -x 3proxy");
            is3proxyRunning = true;
            pid = await get3proxyPid();
        } catch {
            // If not found on host, try Docker
            containerInfo = await find3proxyContainer();

            if (containerInfo) {
                is3proxyRunning = true;
                pid = await get3proxyPidFromDocker(containerInfo.id);
            }
        }

        // Get 3proxy version (if installed)
        let version = "Unknown";

        try {
            const { stdout } = await exec("3proxy -v");

            version = stdout.trim().split("\n")[0];
        } catch {
            // Try getting version from Docker container
            if (is3proxyRunning && containerInfo) {
                try {
                    const { stdout: dockerVersion } = await exec(
                        `docker exec ${containerInfo.id} 3proxy -v 2>&1 || echo "version-check-failed"`
                    );

                    if (dockerVersion.trim() && !dockerVersion.includes("version-check-failed")) {
                        version = dockerVersion.trim().split("\n")[0];
                    } else {
                        // Fallback to image tag
                        const { stdout: imageName } = await exec(
                            `docker ps --filter 'name=${containerInfo.name}' --format '{{.Image}}' | head -1`
                        );
                        const tag = extractImageTag(imageName.trim());

                        version = tag || "Running (Docker)";
                    }
                } catch {
                    version = "Running";
                }
            } else if (is3proxyRunning) {
                version = "Running";
            } else {
                version = "Not found";
            }
        }

        // Check .proxyauth file stats
        const proxyauthPath = path.join(process.cwd(), "3proxy", "users", ".proxyauth");
        let userCount = 0;
        let proxyauthSize = 0;
        let proxyauthModified: string | null = null;

        try {
            const stat = await fs.stat(proxyauthPath);

            proxyauthSize = stat.size;
            proxyauthModified = stat.mtime.toISOString();

            // Count users in .proxyauth (excluding empty lines and comments)
            const content = await fs.readFile(proxyauthPath, "utf8");

            userCount = content.split("\n").filter((line: string) => {
                line = line.trim();

                return line.length > 0 && !line.startsWith("#");
            }).length;
        } catch {
            // File doesn't exist or can't be read
        }

        // Get 3proxy.cfg info
        const configPath = path.join(process.cwd(), "3proxy", "3proxy.cfg");
        let configExists = false;
        let configModified: string | null = null;

        try {
            const stat = await fs.stat(configPath);

            configExists = true;
            configModified = stat.mtime.toISOString();
        } catch {
            configExists = false;
        }

        // Check disk space for logs
        const logsPath = path.join(process.cwd(), "3proxy", "logs");
        let logSize = 0;
        let logFileCount = 0;

        try {
            const logStats = await getDirectoryStats(logsPath);

            logSize = logStats.totalSize;
            logFileCount = logStats.fileCount;
        } catch {
            // Logs directory doesn't exist
        }

        // Read traffic sync info
        let trafficSync: { lastSync: string | null; updatedCount: number } | undefined;

        try {
            const syncInfoPath = "/var/lib/3proxy-ui/traffic-sync.json";
            const syncData = await fs.readFile(syncInfoPath, "utf-8");
            const parsed = JSON.parse(syncData);

            trafficSync = {
                lastSync: parsed.lastSync || null,
                updatedCount: parsed.updatedCount || 0
            };
        } catch {
            // Sync info doesn't exist yet
        }

        // Get memory usage of 3proxy process
        let memoryUsage: number | null = null;

        if (is3proxyRunning) {
            try {
                if (containerInfo) {
                    // Get memory usage from Docker container stats
                    const { stdout } = await exec(
                        `docker stats --no-stream --format '{{.MemUsage}}' ${containerInfo.id} | head -1`
                    );
                    // Parse memory usage like "1.234MiB / 7.774GiB" or "1.234GB / 7.774GB"
                    const memUsageStr = stdout.trim().split(" / ")[0];

                    if (memUsageStr) {
                        // Convert to bytes
                        memoryUsage = parseDockerMemory(memUsageStr);
                    }
                } else {
                    const { stdout } = await exec("ps -o rss= -p $(pgrep -x 3proxy) | head -1");

                    memoryUsage = parseInt(stdout.trim()) * 1024; // Convert KB to bytes
                }
            } catch {
                memoryUsage = null;
            }
        }

        const response = {
            success: true,
            status: {
                isRunning: is3proxyRunning,
                version,
                memoryUsage,
                pid
            },
            config: {
                exists: configExists,
                modified: configModified,
                path: configPath
            },
            users: {
                count: userCount,
                proxyauthSize,
                proxyauthModified
            },
            logs: {
                size: logSize,
                fileCount: logFileCount,
                path: logsPath
            },
            timestamp: new Date().toISOString(),
            ...(trafficSync && { trafficSync })
        };

        return NextResponse.json(response, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    } catch (error) {
        console.error("System status error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to get system status",
                error: error instanceof Error ? error.message : "unknown error"
            },
            { status: 500 }
        );
    }
}
