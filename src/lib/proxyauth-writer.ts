import { promises as fs } from "fs";
import path from "path";

import { prisma } from "@/src/prisma/db";
import { logger } from "@/src/core/logger";
import { hashProxyPassword } from "@/src/core/password-hash";

const PROXYAUTH_PATH = process.env.PROXYAUTH_PATH || path.join(process.cwd(), "3proxy", "users", ".proxyauth");

export interface ProxyauthUpdateResult {
    updatedCount: number;
    deactivatedCount: number;
}

export async function updateProxyauthFile(): Promise<ProxyauthUpdateResult> {
    const allUsers = await prisma.proxyUser.findMany({
        orderBy: { username: "asc" }
    });

    const newLines: string[] = [];
    let updatedCount = 0;

    for (const user of allUsers) {
        if (user.isActive) {
            newLines.push(`${user.username}:CR:${hashProxyPassword(user.password)}`);
        } else {
            const dateStr = user.deactivatedAt ? user.deactivatedAt.toISOString() : "";

            newLines.push(`# DEACTIVATED ${dateStr}: ${user.username}:CR:${hashProxyPassword(user.password)}`);
        }
        updatedCount++;
    }

    await fs.mkdir(path.dirname(PROXYAUTH_PATH), { recursive: true });
    const finalContent = newLines.join("\n") + "\n";

    await fs.writeFile(PROXYAUTH_PATH, finalContent, "utf-8");

    const deactivatedCount = allUsers.filter((u) => !u.isActive).length;

    logger.info(
        `[maintenance] Updated .proxyauth: ${allUsers.length} users (${allUsers.length - deactivatedCount} active, ${deactivatedCount} deactivated)`
    );
    logger.debug(`[maintenance] File at: ${PROXYAUTH_PATH}`);

    return {
        updatedCount,
        deactivatedCount
    };
}
