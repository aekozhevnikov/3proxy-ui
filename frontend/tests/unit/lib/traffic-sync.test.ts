/**
 * @jest-environment node
 *
 * 3proxy log offsets: the main property is that the same entries never land
 * in dataUsed twice and that an unfinished line is not lost.
 */
import {
    existsSync,
    mkdtempSync,
    unlinkSync,
    writeFileSync,
    appendFileSync,
    renameSync,
    rmSync,
    mkdirSync
} from "fs";
import os from "os";
import path from "path";

const TEST_DIR = mkdtempSync(path.join(os.tmpdir(), "traffic-sync-test-"));
const LOG_FILE = path.join(TEST_DIR, "3proxy.log");

// The module reads SYNC_INFO_FILE at load time, so the variable is set
// before require.
process.env.SYNC_INFO_FILE = path.join(TEST_DIR, "traffic-sync.json");

type TrafficSync = typeof import("@/src/lib/traffic-sync");
let sync: TrafficSync;

function logLine(user: string, sent: number): string {
    return JSON.stringify({
        time_unix: 1790413200,
        proxy: { "type:": "PROXY", port: 3128 },
        error: { code: "00000" },
        auth: { user },
        client: { ip: "203.0.113.10", port: 40000 },
        server: { ip: "93.184.216.34", port: 80 },
        bytes: { sent, received: 0 },
        request: { hostname: "example.com" },
        message: "GET http://example.com/ HTTP/1.1"
    });
}

/** Reads the log the same way the route does: identify first, then read. */
async function readFrom(
    filePath: string,
    storedOffset?: number
): Promise<{ lines: string[]; nextOffset: number; key: string }> {
    const { key, size } = await sync.identifyLogFile(filePath);
    const result = await sync.readNewLogContent(filePath, storedOffset, size);

    return { ...result, key };
}

beforeAll(() => {
    jest.resetModules();
    sync = require("@/src/lib/traffic-sync");
});

afterAll(() => {
    if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
    }
});

describe("readNewLogContent", () => {
    it("reads the whole file when no offset is stored", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n${logLine("b", 20)}\n`);

        const result = await readFrom(LOG_FILE);

        expect(result.lines).toHaveLength(2);
        expect(result.nextOffset).toBeGreaterThan(0);
    });

    it("returns only newly appended lines on the second read", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n`);
        const first = await readFrom(LOG_FILE);

        appendFileSync(LOG_FILE, `${logLine("b", 20)}\n`);

        const second = await readFrom(LOG_FILE, first.nextOffset);

        expect(second.lines).toHaveLength(1);
        expect(JSON.parse(second.lines[0]).auth.user).toBe("b");
    });

    it("returns nothing when the file has not changed", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n`);
        const first = await readFrom(LOG_FILE);

        const second = await readFrom(LOG_FILE, first.nextOffset);

        expect(second.lines).toEqual([]);
        expect(second.nextOffset).toBe(first.nextOffset);
    });

    it("does not consume a partially written trailing line", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n${logLine("b", 20).slice(0, 40)}`);

        const first = await readFrom(LOG_FILE);

        // The unfinished line must not reach the parser
        expect(first.lines).toHaveLength(1);

        // 3proxy appends the rest of the line and terminates it
        appendFileSync(LOG_FILE, `${logLine("b", 20).slice(40)}\n`);

        const second = await readFrom(LOG_FILE, first.nextOffset);

        expect(second.lines).toHaveLength(1);
        expect(JSON.parse(second.lines[0]).auth.user).toBe("b");
    });

    it("ignores a line that is not terminated at all", async () => {
        writeFileSync(LOG_FILE, "partial line without newline");

        const result = await readFrom(LOG_FILE);

        expect(result.lines).toEqual([]);
        expect(result.nextOffset).toBe(0);
    });

    it("restarts from zero when the file shrank (rotation or truncation)", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n${logLine("b", 20)}\n${logLine("c", 30)}\n`);

        const first = await readFrom(LOG_FILE);

        writeFileSync(LOG_FILE, `${logLine("d", 40)}\n`);

        const second = await readFrom(LOG_FILE, first.nextOffset);

        expect(second.lines).toHaveLength(1);
        expect(JSON.parse(second.lines[0]).auth.user).toBe("d");
    });

    it("keeps offsets independent per file", async () => {
        const rotated = path.join(TEST_DIR, "3proxy.log.2026.09.20");

        writeFileSync(LOG_FILE, `${logLine("current", 10)}\n`);
        writeFileSync(rotated, `${logLine("rotated", 20)}\n`);

        const current = await readFrom(LOG_FILE);

        appendFileSync(rotated, `${logLine("rotated2", 30)}\n`);

        const rotatedAfter = await readFrom(rotated, 0);
        const currentAfter = await readFrom(LOG_FILE, current.nextOffset);

        expect(rotatedAfter.lines).toHaveLength(2);
        expect(currentAfter.lines).toHaveLength(0);
    });

    it("keeps the same key and offset when the file is renamed (3proxy rotation)", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n`);

        const before = await readFrom(LOG_FILE);

        // 3proxy rotation: the file is renamed, content and inode are the same
        renameSync(LOG_FILE, path.join(TEST_DIR, "3proxy.log.2026.09.20"));

        const after = await readFrom(path.join(TEST_DIR, "3proxy.log.2026.09.20"), before.nextOffset);

        expect(after.key).toBe(before.key);
        expect(after.lines).toHaveLength(0);
    });

    it("handles multi-byte characters without corrupting the offset", async () => {
        // Non-ASCII payload on purpose: byte length and character count differ,
        // which is exactly what the offset bookkeeping must not confuse.
        const line = JSON.stringify({ message: "привет мир", auth: { user: "юзер" } });

        writeFileSync(LOG_FILE, `${line}\n`);

        const first = await readFrom(LOG_FILE);

        expect(first.lines).toHaveLength(1);
        expect(JSON.parse(first.lines[0]).message).toBe("привет мир");
        // The offset must match the file size in bytes, not in characters
        expect(first.nextOffset).toBe(Buffer.byteLength(`${line}\n`, "utf-8"));
    });
});

describe("sync state", () => {
    it("seeds offsets with the current file sizes without reading them", async () => {
        const dir = path.join(TEST_DIR, "seed");

        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, "3proxy.log"), `${logLine("a", 10)}\n`);

        const filePath = path.join(dir, "3proxy.log");
        const identity = await sync.identifyLogFile(filePath);
        const offsets = sync.seedOffsets([identity]);

        expect(offsets[identity.key]).toBe(identity.size);

        const result = await readFrom(filePath, offsets[identity.key]);
        expect(result.lines).toEqual([]);
    });

    it("round-trips offsets through the state file", async () => {
        writeFileSync(LOG_FILE, `${logLine("a", 10)}\n`);
        const first = await readFrom(LOG_FILE);

        await sync.writeSyncState({ offsets: { [first.key]: first.nextOffset }, existed: true, lastSync: "2026-09-26T00:00:00.000Z" });

        const state = await sync.readSyncState();
        expect(state.offsets).toEqual({ [first.key]: first.nextOffset });
        expect(state.existed).toBe(true);
        expect(state.lastSync).toBe("2026-09-26T00:00:00.000Z");
    });

    it("reports a missing state file as not yet initialised", async () => {
        if (existsSync(process.env.SYNC_INFO_FILE!)) {
            unlinkSync(process.env.SYNC_INFO_FILE!);
        }

        const state = await sync.readSyncState();

        expect(state.offsets).toBeNull();
        expect(state.existed).toBe(false);
    });

    it("reports a state file without offsets as an upgrade", async () => {
        writeFileSync(
            process.env.SYNC_INFO_FILE!,
            JSON.stringify({ lastSync: "2026-09-25T00:00:00.000Z", sourceFile: "3proxy.log", updatedCount: 3 })
        );

        const state = await sync.readSyncState();

        expect(state.offsets).toBeNull();
        expect(state.existed).toBe(true);
    });

    it("treats a corrupt state file as uninitialised", async () => {
        writeFileSync(process.env.SYNC_INFO_FILE!, "{not json");

        const state = await sync.readSyncState();

        expect(state.offsets).toBeNull();
    });
});
