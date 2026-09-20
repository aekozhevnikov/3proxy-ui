import { exec as execCb } from "child_process";
import { promises as fs } from "fs";
import path from "path";

export const exec = (cmd: string, timeoutMs = 5000): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execCb(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
};

export async function getDirectoryStats(dirPath: string): Promise<{ totalSize: number; fileCount: number }> {
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

export function parseDockerMemory(memStr: string): number {
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

    const baseUnit = unit.replace(/b$/, "").toLowerCase();
    const multiplier = multipliers[baseUnit] || 1;

    return Math.round(value * multiplier);
}

export function extractImageTag(imageName: string): string {
    const parts = imageName.split(":");

    if (parts.length >= 2) {
        return parts[parts.length - 1];
    }

    const nameParts = imageName.split("/");

    return nameParts[nameParts.length - 1];
}

export async function get3proxyPid(): Promise<number | null> {
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

export async function get3proxyPidFromDocker(containerId: string): Promise<number | null> {
    try {
        const { stdout } = await exec(`docker inspect --format '{{.State.Pid}}' ${containerId}`);
        const pid = parseInt(stdout.trim());

        return isNaN(pid) ? null : pid;
    } catch {
        return null;
    }
}

export async function get3proxyVersion(containerInfo: { id: string; name: string } | null): Promise<string> {
    try {
        const { stdout } = await exec("3proxy -v");

        return stdout.trim().split("\n")[0];
    } catch {
        if (containerInfo) {
            try {
                const { stdout: dockerVersion } = await exec(
                    `docker exec ${containerInfo.id} 3proxy -v 2>&1 || echo "version-check-failed"`
                );

                if (dockerVersion.trim() && !dockerVersion.includes("version-check-failed")) {
                    return dockerVersion.trim().split("\n")[0];
                }

                const { stdout: imageName } = await exec(
                    `docker ps --filter 'name=${containerInfo.name}' --format '{{.Image}}' | head -1`
                );
                const tag = extractImageTag(imageName.trim());

                return tag || "Running (Docker)";
            } catch {
                return "Running";
            }
        }

        return "Not found";
    }
}

export async function get3proxyMemoryUsage(containerInfo: { id: string; name: string } | null): Promise<number | null> {
    if (containerInfo) {
        try {
            const { stdout } = await exec(
                `docker stats --no-stream --format '{{.MemUsage}}' ${containerInfo.id} | head -1`
            );
            const memUsageStr = stdout.trim().split(" / ")[0];

            if (memUsageStr) {
                return parseDockerMemory(memUsageStr);
            }
        } catch {
            return null;
        }
    } else {
        try {
            const { stdout } = await exec("ps -o rss= -p $(pgrep -x 3proxy) | head -1");

            return parseInt(stdout.trim()) * 1024; // Convert KB to bytes
        } catch {
            return null;
        }
    }

    return null;
}

export async function find3proxyContainer(): Promise<{ id: string; name: string } | null> {
    try {
        const { stdout } = await exec("docker ps --filter 'name=3proxy' --format '{{.ID}}\t{{.Names}}' | head -1");

        const parts = stdout.trim().split("\t");

        if (parts[0] && parts[0].length > 0) {
            return { id: parts[0], name: parts[1] || "3proxy" };
        }

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
