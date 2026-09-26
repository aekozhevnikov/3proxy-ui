/**
 * @jest-environment node
 *
 * Проверяет сквозное поведение POST /api/users/maintenance на реальной SQLite:
 * трафик из лога попадает в dataUsed ровно один раз, даже если maintenance
 * вызывается многократно, а ротация логов не приводит к потере записей.
 */
import { execSync } from "child_process";

// `prisma migrate deploy` в beforeAll занимает заметно больше дефолтных 5 секунд
jest.setTimeout(30000);

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, appendFileSync, renameSync } from "fs";
import os from "os";
import path from "path";

const TEST_DIR = mkdtempSync(path.join(os.tmpdir(), "maintenance-route-"));
const TEST_DB = path.join(TEST_DIR, "route.db");
const LOGS_DIR = path.join(TEST_DIR, "logs");

// Все переменные читаются модулями на этапе загрузки, поэтому выставляем их
// до require.
process.env.DATABASE_URL = `file:${TEST_DB}`;
process.env.LOGS_DIR = LOGS_DIR;
process.env.SYNC_INFO_FILE = path.join(TEST_DIR, "traffic-sync.json");
process.env.PROXYAUTH_PATH = path.join(TEST_DIR, "users", ".proxyauth");

mkdirSync(LOGS_DIR, { recursive: true });

let prisma: typeof import("@/src/prisma/db").prisma;
let POST: typeof import("@/src/app/api/users/maintenance/route").POST;

function logLine(user: string, sent: number): string {
    return (
        JSON.stringify({
            time_unix: 1790413200,
            proxy: { "type:": "PROXY", port: 3128 },
            error: { code: "00000" },
            auth: { user },
            client: { ip: "203.0.113.10", port: 40000 },
            server: { ip: "93.184.216.34", port: 80 },
            bytes: { sent, received: 0 },
            request: { hostname: "example.com" },
            message: "GET http://example.com/ HTTP/1.1"
        }) + "\n"
    );
}

function request(): Request {
    return new Request("http://localhost/api/users/maintenance", {
        method: "POST",
        body: JSON.stringify({ logsDir: LOGS_DIR }),
        headers: { "Content-Type": "application/json" }
    });
}

async function dataUsedFor(username: string): Promise<bigint> {
    const user = await prisma.proxyUser.findUnique({ where: { username }, select: { dataUsed: true } });

    return user!.dataUsed;
}

describe("maintenance route traffic accounting", () => {
    beforeAll(async () => {
        execSync("npx prisma migrate deploy", {
            env: { ...process.env, DATABASE_URL: `file:${TEST_DB}`, NODE_ENV: "test" },
            stdio: "ignore"
        });

        jest.resetModules();

        ({ prisma } = require("@/src/prisma/db"));
        ({ POST } = require("@/src/app/api/users/maintenance/route"));

        await prisma.proxyUser.create({
            data: { username: "routeuser", password: "pass", isActive: true, dataUsed: BigInt(0) }
        });
    });

    afterAll(async () => {
        await prisma.proxyUser.deleteMany({});
        await prisma.$disconnect();

        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    beforeEach(async () => {
        await prisma.proxyUser.update({
            where: { username: "routeuser" },
            data: { dataUsed: BigInt(0), isActive: true, deactivatedAt: null, dataLimit: null }
        });

        // Чистый старт: файла состояния нет, логи пусты
        rmSync(process.env.SYNC_INFO_FILE!, { force: true });
        rmSync(LOGS_DIR, { recursive: true, force: true });
        mkdirSync(LOGS_DIR, { recursive: true });
    });

    it("counts the traffic from a log exactly once across repeated calls", async () => {
        writeFileSync(path.join(LOGS_DIR, "3proxy.log"), logLine("routeuser", 5000));

        const first = await POST(request());
        expect(first.status).toBe(200);
        expect((await first.json()).totalTraffic).toBe(5000);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(5000));

        // Второй и третий прогоны не должны прибавлять те же байты снова
        for (let i = 0; i < 2; i++) {
            const response = await POST(request());
            expect(response.status).toBe(200);
            expect((await response.json()).totalTraffic).toBe(0);
        }

        expect(await dataUsedFor("routeuser")).toBe(BigInt(5000));
    });

    it("counts only newly appended lines", async () => {
        const logPath = path.join(LOGS_DIR, "3proxy.log");

        writeFileSync(logPath, logLine("routeuser", 1000));
        await POST(request());

        appendFileSync(logPath, logLine("routeuser", 2000));
        const response = await POST(request());

        expect((await response.json()).totalTraffic).toBe(2000);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(3000));
    });

    it("does not lose traffic when 3proxy rotates the log", async () => {
        const logPath = path.join(LOGS_DIR, "3proxy.log");
        const rotatedPath = path.join(LOGS_DIR, "3proxy.log.2026.09.20");

        writeFileSync(logPath, logLine("routeuser", 4000));
        await POST(request());

        // Ротация 3proxy: файл переименовывается (inode сохраняется), запись
        // продолжается в переименованный файл, а новый 3proxy.log пустой
        renameSync(logPath, rotatedPath);
        appendFileSync(rotatedPath, logLine("routeuser", 7000));
        writeFileSync(logPath, "");

        const response = await POST(request());

        expect((await response.json()).totalTraffic).toBe(7000);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(11000));
    });

    it("skips history accumulated before the upgrade to offset tracking", async () => {
        // Файл состояния есть, но записан старой версией кода — без смещений
        writeFileSync(
            process.env.SYNC_INFO_FILE!,
            JSON.stringify({ lastSync: "2026-09-25T00:00:00.000Z", sourceFile: "3proxy.log", updatedCount: 3 })
        );

        // Лог накоплен до включения синхронизации по смещениям
        writeFileSync(path.join(LOGS_DIR, "3proxy.log"), logLine("routeuser", 900000));

        const response = await POST(request());

        expect((await response.json()).totalTraffic).toBe(0);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(0));

        // После перехода новые строки считаются как обычно
        appendFileSync(path.join(LOGS_DIR, "3proxy.log"), logLine("routeuser", 1000));

        const next = await POST(request());
        expect((await next.json()).totalTraffic).toBe(1000);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(1000));
    });

    it("counts the log from the start when there is no state file yet", async () => {
        writeFileSync(path.join(LOGS_DIR, "3proxy.log"), logLine("routeuser", 900000));

        const response = await POST(request());

        expect((await response.json()).totalTraffic).toBe(900000);
        expect(await dataUsedFor("routeuser")).toBe(BigInt(900000));
    });
});
