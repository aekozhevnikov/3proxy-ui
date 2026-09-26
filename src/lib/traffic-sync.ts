import { promises as fs } from "fs";
import path from "path";

import { logger } from "@/src/core/logger";

const SYNC_INFO_FILE = process.env.SYNC_INFO_FILE || path.join(process.cwd(), "data", "traffic-sync.json");

export interface SyncState {
    lastSync?: string;
    updatedCount?: number;
    deactivatedCount?: number;
    totalTraffic?: number;
    sourceFile?: string;
    /**
     * How many bytes of each file were already accounted for, keyed by
     * identifyLogFile. null — no offsets recorded yet.
     */
    offsets: Record<string, number> | null;
    /**
     * Whether the state file existed at all. Two cases are distinguished:
     *  - the file exists but has no offsets — an upgrade from the previous
     *    version: the accumulated history was already counted and must be skipped;
     *  - the file does not exist — a clean start, read the log from zero.
     */
    existed: boolean;
}

export const emptySyncState = (): SyncState => ({ offsets: null, existed: false });

export async function readSyncState(): Promise<SyncState> {
    let content: string;

    try {
        content = await fs.readFile(SYNC_INFO_FILE, "utf-8");
    } catch {
        return emptySyncState();
    }

    try {
        const parsed = JSON.parse(content) as Partial<SyncState>;

        return {
            ...parsed,
            offsets: parsed.offsets && typeof parsed.offsets === "object" ? parsed.offsets : null,
            existed: true
        };
    } catch {
        // Corrupt file — assume nothing was accounted for
        return { offsets: null, existed: true };
    }
}

export async function writeSyncState(state: SyncState): Promise<void> {
    try {
        await fs.mkdir(path.dirname(SYNC_INFO_FILE), { recursive: true });
        await fs.writeFile(SYNC_INFO_FILE, JSON.stringify(state), "utf-8");
    } catch (error) {
        // A failure to persist state must not break the sync itself
        logger.error("[maintenance] Failed to write sync info file:", error);
    }
}

export interface LogFileIdentity {
    /** Offset key: dev:ino. */
    key: string;
    size: number;
}

/**
 * Identity of a log file.
 *
 * The key is built from the inode rather than the name: on restart 3proxy
 * rotates its log, renaming 3proxy.log to 3proxy.log.YYYY.MM.DD and
 * continuing to write into the renamed file. Keyed by name, already
 * counted bytes would simply get a new name and be counted twice.
 */
export async function identifyLogFile(filePath: string): Promise<LogFileIdentity> {
    const stats = await fs.stat(filePath);

    return { key: `${stats.dev}:${stats.ino}`, size: stats.size };
}

export interface NewLogContent {
    /** Complete lines, ready to be parsed. */
    lines: string[];
    /** Offset just past the last complete line. */
    nextOffset: number;
}

/**
 * Reads only what has appeared in the log since the last accounting.
 *
 * Reading the whole file made the same entries land in dataUsed on every run,
 * and picking the newest file by mtime raced with 3proxy writing the log.
 *
 * The last line may still be being written — it is not consumed and waits for
 * the next run.
 */
export async function readNewLogContent(
    filePath: string,
    storedOffset: number | undefined,
    size: number
): Promise<NewLogContent> {
    // File shrank or was rewritten: start reading from scratch
    const offset = storedOffset !== undefined && storedOffset <= size ? storedOffset : 0;

    if (offset >= size) {
        return { lines: [], nextOffset: offset };
    }

    const handle = await fs.open(filePath, "r");

    try {
        const length = size - offset;
        const buffer = Buffer.alloc(length);

        await handle.read(buffer, 0, length, offset);

        const text = buffer.toString("utf-8");
        const lastNewline = text.lastIndexOf("\n");

        if (lastNewline === -1) {
            return { lines: [], nextOffset: offset };
        }

        const complete = text.slice(0, lastNewline + 1);
        const lines = complete.split("\n").filter((line) => line.trim().length > 0);

        return { lines, nextOffset: offset + Buffer.byteLength(complete, "utf-8") };
    } finally {
        await handle.close();
    }
}

/**
 * Initial seeding: the current size of every log counts as already accounted for.
 * Without this, switching to the offset scheme would double the historical traffic.
 */
export function seedOffsets(files: LogFileIdentity[]): Record<string, number> {
    const offsets: Record<string, number> = {};

    for (const file of files) {
        offsets[file.key] = file.size;
    }

    return offsets;
}
