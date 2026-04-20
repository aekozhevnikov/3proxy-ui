"use server";

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/prisma/db";

const execAsync = promisify(exec);

export async function update3proxyConfig(): Promise<{ success: boolean; message: string; userCount: number }> {
    try {
        // Get ALL users from database (both active and inactive)
        // Option 1: All proxy users are stored in ProxyUser table, including admin
        const users = await prisma.proxyUser.findMany({
            orderBy: { username: "asc" }
        });

        console.debug(`[config] Updating .proxyauth with ${users.length} users from database`);
        console.debug(
            `[config] Users summary: active=${users.filter((u) => u.isActive).length}, deactivated=${users.filter((u) => !u.isActive).length}`
        );

        // Build array of users for .proxyauth file
        const lines = users.map((user) => {
            if (user.isActive) {
                return `${user.username}:${user.password}`;
            } else {
                // For deactivated users, include a comment with deactivation timestamp
                const dateStr = user.deactivatedAt ? user.deactivatedAt.toISOString() : "";

                return `# DEACTIVATED ${dateStr}: ${user.username}:${user.password}`;
            }
        });

        // Write .proxyauth file (complete regeneration)
        const proxyauthPath = path.join(process.cwd(), "3proxy", "users", ".proxyauth");

        console.debug(`[config] Writing .proxyauth to: ${proxyauthPath}`);
        fs.mkdirSync(path.dirname(proxyauthPath), { recursive: true });
        fs.writeFileSync(proxyauthPath, lines.join("\n") + "\n", "utf8");

        console.debug(`[config] File content preview:`);
        lines.forEach((line, i) => {
            // Show first 5 lines, and also show deactivated users
            if (i < 5 || !users[i].isActive) {
                console.debug(`[config]   ${line}`);
            }
        });
        if (lines.length > 5) {
            console.debug(`[config]   ... and ${lines.length - 5} more lines`);
        }

        // Try to restart 3proxy Docker container for immediate effect
        try {
            // Find 3proxy container
            let containerId = null;

            console.debug("[config] Searching for 3proxy Docker container...");
            try {
                const { stdout } = await execAsync("docker ps --filter 'name=3proxy' --format '{{.ID}}' | head -1");

                containerId = stdout.trim();
                if (containerId) {
                    console.debug(`[config] Found container with name filter '3proxy': ${containerId}`);
                }
            } catch {
                // ignore errors, try alternative name
            }

            if (!containerId) {
                try {
                    const { stdout } = await execAsync(
                        "docker ps --filter 'name=vpn-3proxy' --format '{{.ID}}' | head -1"
                    );

                    containerId = stdout.trim();
                    if (containerId) {
                        console.debug(`[config] Found container with name filter 'vpn-3proxy': ${containerId}`);
                    }
                } catch {
                    // ignore
                }
            }

            if (containerId) {
                console.debug(`[config] Restarting container ${containerId}...`);
                await execAsync(`docker restart ${containerId}`);
                console.debug(`[config] Container ${containerId} restarted successfully`);
            } else {
                console.debug("[config] WARNING: No 3proxy Docker container found, config file updated only");
                console.debug("[config] 3proxy may need to be restarted manually or may auto-reload on file change");
            }
        } catch (error) {
            console.warn("[config] Could not restart 3proxy container:", error.message);
        }

        revalidatePath("/admin/users");

        return {
            success: true,
            message: `Configuration updated (${users.length} users, ${users.filter((u) => !u.isActive).length} deactivated)`,
            userCount: users.length
        };
    } catch (error) {
        console.error("Config update error:", error);
        throw new Error(`Failed to update config: ${error instanceof Error ? error.message : "unknown error"}`);
    }
}
