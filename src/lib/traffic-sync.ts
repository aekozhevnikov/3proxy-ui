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
     * Сколько байт каждого файла уже учтено, по ключу из identifyLogFile.
     * null — смещений ещё нет.
     */
    offsets: Record<string, number> | null;
    /**
     * Был ли файл состояния вообще. Различаем два случая:
     *  - файл есть, но смещений нет — обновление со старой версии: накопленная
     *    история уже учтена прежним кодом, её нужно пропустить;
     *  - файла нет — чистый старт, читаем лог с нуля.
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
        // Файл повреждён — считаем, что учтённого ничего нет
        return { offsets: null, existed: true };
    }
}

export async function writeSyncState(state: SyncState): Promise<void> {
    try {
        await fs.mkdir(path.dirname(SYNC_INFO_FILE), { recursive: true });
        await fs.writeFile(SYNC_INFO_FILE, JSON.stringify(state), "utf-8");
    } catch (error) {
        // Сбой записи состояния не должен ломать саму синхронизацию
        logger.error("[maintenance] Failed to write sync info file:", error);
    }
}

export interface LogFileIdentity {
    /** Ключ для смещений: dev:ino. */
    key: string;
    size: number;
}

/**
 * Идентификатор файла лога.
 *
 * Ключ строится на inode, а не на имени: 3proxy при перезапуске ротирует лог,
 * переименовывая 3proxy.log в 3proxy.log.YYYY.MM.DD и продолжая писать уже в
 * переименованный файл. При учёте по имени уже учтённые байты получили бы
 * новое имя и были бы посчитаны повторно.
 */
export async function identifyLogFile(filePath: string): Promise<LogFileIdentity> {
    const stats = await fs.stat(filePath);

    return { key: `${stats.dev}:${stats.ino}`, size: stats.size };
}

export interface NewLogContent {
    /** Полные строки, готовые к разбору. */
    lines: string[];
    /** Смещение после последней полной строки. */
    nextOffset: number;
}

/**
 * Читает только то, что появилось в логе после прошлого учёта.
 *
 * Чтение целиком приводило к тому, что одни и те же записи попадали в dataUsed
 * на каждом прогоне, а выбор «самого свежего по mtime» был гонкой с 3proxy,
 * который пишет лог параллельно.
 *
 * Последняя строка может быть не дописана — она не считается и остаётся
 * ждать следующего прогона.
 */
export async function readNewLogContent(
    filePath: string,
    storedOffset: number | undefined,
    size: number
): Promise<NewLogContent> {
    // Файл уменьшился или был перезаписан: начинаем читать заново
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
 * Первичная инициализация: текущий размер каждого лога считается уже учтённым.
 * Без этого переход на схему со смещениями задвоил бы исторический трафик.
 */
export function seedOffsets(files: LogFileIdentity[]): Record<string, number> {
    const offsets: Record<string, number> = {};

    for (const file of files) {
        offsets[file.key] = file.size;
    }

    return offsets;
}
