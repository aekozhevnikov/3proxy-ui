/**
 * Записи логов 3proxy в формате из logformat в 3proxy/3proxy.cfg:
 *
 *   {"time_unix":%t, "proxy":{"type:":"%N","port":%p}, "error":{"code":"%E"},
 *    "auth":{"user":"%U"}, "client":{"ip":"%C","port":%c},
 *    "server":{"ip":"%R","port":%r}, "bytes":{"sent":%O, "received":%I},
 *    "request":{"hostname":"%n"}, "message":"%T"}
 *
 * Поле proxy называется "type:" — с двоеточием; парсер трафика на это не
 * смотрит, но log-parser фильтрует по нему, поэтому пишем как в конфиге.
 */
import { LOGS_CONTAINER_DIR } from "./environment.js";
import { execInContainer } from "./helpers.js";

export interface ThreeProxyLogEntry {
    timeUnix: number;
    proxyType: "PROXY" | "SOCKS" | "ADMIN";
    port: number;
    errorCode?: string;
    user: string;
    clientIp: string;
    clientPort: number;
    serverIp: string;
    serverPort: number;
    sent: number;
    received: number;
    hostname: string;
    message: string;
}

export function buildLogEntry(partial: Partial<ThreeProxyLogEntry> & { user: string }): ThreeProxyLogEntry {
    return {
        timeUnix: Math.floor(Date.now() / 1000),
        proxyType: "PROXY",
        port: 3128,
        errorCode: "00000",
        clientIp: "203.0.113.200",
        clientPort: 40000,
        serverIp: "93.184.216.34",
        serverPort: 80,
        sent: 0,
        received: 0,
        hostname: "example.com",
        message: "GET http://example.com/ HTTP/1.1",
        ...partial
    };
}

export function serializeLogEntry(entry: ThreeProxyLogEntry): string {
    return JSON.stringify({
        time_unix: entry.timeUnix,
        proxy: { "type:": entry.proxyType, port: entry.port },
        error: { code: entry.errorCode ?? "00000" },
        auth: { user: entry.user },
        client: { ip: entry.clientIp, port: entry.clientPort },
        server: { ip: entry.serverIp, port: entry.serverPort },
        bytes: { sent: entry.sent, received: entry.received },
        request: { hostname: entry.hostname },
        message: entry.message
    });
}

/**
 * Файл, в который 3proxy пишет прямо сейчас.
 *
 * При старте с флагом ротации `D` 3proxy переименовывает 3proxy.log в
 * 3proxy.log.YYYY.MM.DD и продолжает писать уже в переименованный файл, а
 * новый 3proxy.log остаётся пустым. Выбор «самого свежего по mtime» врёт:
 * пустой файл новее. Поэтому активный файл определяется по признаку —
 * только в нём есть стартовая строка 3proxy «Accepting connections».
 */
export async function activeLogFile(container: string): Promise<string> {
    const output = await execInContainer(
        container,
        `grep -l "Accepting connections" ${LOGS_CONTAINER_DIR}/3proxy.log* 2>/dev/null | head -1`
    );

    const match = output.trim().split("\n")[0];

    if (match) {
        return match;
    }

    const fallback = await execInContainer(container, `ls -t ${LOGS_CONTAINER_DIR}/3proxy.log* 2>/dev/null | head -1`);

    return fallback.trim() || `${LOGS_CONTAINER_DIR}/3proxy.log`;
}

/**
 * Дописывает запись в лог контейнера.
 *
 * По умолчанию — в активный файл 3proxy. Для fail2ban нужен явный target:
 * jail в entrypoint.sh жёстко настроен на `logpath = /etc/3proxy/logs/3proxy.log`,
 * и после ротации 3proxy продолжает писать в переименованный файл, который
 * jail не читает.
 */
export async function appendLogEntry(container: string, entry: ThreeProxyLogEntry, targetFile?: string): Promise<void> {
    // Создание и удаление пользователя перезапускают 3proxy, и он дописывает
    // стартовые строки уже после возврата API. Ждём их, иначе 3proxy вновь
    // окажется самым свежим файлом и maintenance прочитает не тот.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const line = serializeLogEntry(entry);
    const target = targetFile ?? (await activeLogFile(container));

    // Запись начинается с перевода строки. 3proxy пишет в этот файл
    // параллельно и может держать полузаписанную строку; без разделителя
    // запись склеилась бы с ней, и весь JSON не распарсился бы — трафик
    // теста молча терялся.
    await execInContainer(container, `mkdir -p ${LOGS_CONTAINER_DIR} && printf '\\n%s\\n' '${line}' >> ${target}`);

    // Поднимаем mtime: maintenance выбирает самый свежий файл, и запись должна
    // оказаться в нём, а не в том, куда 3proxy успел дописать после нас.
    await execInContainer(container, `touch ${target}`);
}

/** Путь, за которым следит jail fail2ban (совпадает с logpath в entrypoint.sh). */
export const FAIL2BAN_LOG_PATH = `${LOGS_CONTAINER_DIR}/3proxy.log`;

/**
 * Читает активный лог контейнера.
 *
 * Именно один файл, а не все 3proxy.log*: maintenance тоже читает самый
 * свежий файл, и ожидания теста должны считаться по тем же данным, что
 * попадут в dataUsed.
 */
export async function readRuntimeLog(container: string): Promise<string> {
    const target = await activeLogFile(container);

    return execInContainer(container, `cat ${target} 2>/dev/null || true`);
}
