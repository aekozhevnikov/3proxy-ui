"use server";

import fs from "fs";
import path from "path";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/prisma/db";
import { proxyauthEntry } from "@/src/core/password-hash";
import { find3proxyContainer, restart3proxyContainer } from "@/src/core/docker";

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
                return proxyauthEntry(user.username, user.password);
            } else {
                // For deactivated users, include a comment with deactivation timestamp
                const dateStr = user.deactivatedAt ? user.deactivatedAt.toISOString() : "";

                return `# DEACTIVATED ${dateStr}: ${proxyauthEntry(user.username, user.password)}`;
            }
        });

        // Write .proxyauth file (complete regeneration)
        const proxyauthPath = process.env.PROXYAUTH_PATH || path.join(process.cwd(), "3proxy", "users", ".proxyauth");

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
            console.debug("[config] Searching for 3proxy Docker container...");
            const containerInfo = await find3proxyContainer();

            if (containerInfo) {
                console.debug(`[config] Found 3proxy container: ${containerInfo.id} (${containerInfo.name})`);
                console.debug(`[config] Restarting container ${containerInfo.id}...`);
                await restart3proxyContainer(containerInfo.id);
                console.debug(`[config] Container ${containerInfo.id} restarted successfully`);
            } else {
                console.debug("[config] WARNING: No 3proxy Docker container found, config file updated only");
                console.debug("[config] 3proxy may need to be restarted manually or may auto-reload on file change");
            }
        } catch (error) {
            console.warn(
                "[config] Could not restart 3proxy container:",
                error instanceof Error ? error.message : String(error)
            );
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
