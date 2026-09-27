import { promises as fs } from "fs";
import path from "path";

import { prisma } from "@/src/prisma/db";
import { logger } from "@/src/core/logger";
import { proxyauthEntry } from "@/src/core/password-hash";
import { find3proxyContainer, restart3proxyContainer } from "@/src/core/docker";

const PROXYAUTH_PATH = process.env.PROXYAUTH_PATH || path.join(process.cwd(), "3proxy", "users", ".proxyauth");

/**
 * Set when a restart failed. The comparison below is against what is on disk,
 * so without this a single failed restart would look identical to "already
 * applied" and the deactivation would never take effect.
 */
let reloadPending = false;

export interface ProxyauthUpdateResult {
    updatedCount: number;
    deactivatedCount: number;
    /** False when the file already had this content, so 3proxy needs no reload. */
    changed: boolean;
    reloaded: boolean;
}

export async function updateProxyauthFile(): Promise<ProxyauthUpdateResult> {
    const allUsers = await prisma.proxyUser.findMany({
        orderBy: { username: "asc" }
    });

    const lines: string[] = [];

    // Deactivated users are left out entirely. A "#" line is not a comment in a
    // file pulled in by 3proxy's $ directive: the included content is parsed by
    // a recursive parsestr() with no # case, so a "commented out" user is still
    // registered and can authenticate.
    for (const user of allUsers) {
        if (user.isActive) {
            lines.push(proxyauthEntry(user.username, user.password));
        }
    }

    await fs.mkdir(path.dirname(PROXYAUTH_PATH), { recursive: true });
    const finalContent = lines.join("\n") + "\n";

    let previous = "";

    try {
        previous = await fs.readFile(PROXYAUTH_PATH, "utf-8");
    } catch {
        // No file yet, which counts as changed.
    }

    const deactivatedCount = allUsers.filter((u) => !u.isActive).length;

    // Every hash uses a fresh random salt, so the bytes differ on every write
    // even when nothing about the accounts changed. Comparing the usernames
    // that would be served is what actually decides whether a reload is needed.
    const shouldReload = reloadPending || activeSignature(previous) !== activeSignature(finalContent);

    await fs.writeFile(PROXYAUTH_PATH, finalContent, "utf-8");

    logger.info(
        `[maintenance] Updated .proxyauth: ${allUsers.length} users (${allUsers.length - deactivatedCount} active, ${deactivatedCount} deactivated)`
    );
    logger.debug(`[maintenance] File at: ${PROXYAUTH_PATH}`);

    let reloaded = false;

    if (shouldReload) {
        reloaded = await reload3proxy();
        reloadPending = !reloaded;
    }

    return {
        updatedCount: allUsers.length,
        deactivatedCount,
        changed: shouldReload,
        reloaded
    };
}

/** The usernames the file grants access to, ignoring salts and hashes. */
function activeSignature(content: string): string {
    return content
        .split("\n")
        .map((line) => line.split(":")[0])
        .filter(Boolean)
        .sort()
        .join("\n");
}

/**
 * 3proxy reads the user list once at startup. Rewriting the file therefore
 * changes nothing until it restarts, which means a user who just went over
 * their quota keeps proxying until something restarts 3proxy. Doing it here,
 * only when the served set actually changed, closes that window without
 * restarting the proxy on every maintenance tick.
 */
async function reload3proxy(): Promise<boolean> {
    try {
        const container = await find3proxyContainer();

        if (!container) {
            logger.info("[maintenance] No 3proxy container found, wrote the file but could not reload it");

            return false;
        }

        await restart3proxyContainer(container.id);
        logger.info("[maintenance] Reloaded 3proxy to pick up the new user list");

        return true;
    } catch (error) {
        logger.warn("[maintenance] Could not restart 3proxy:", error instanceof Error ? error.message : String(error));

        return false;
    }
}
