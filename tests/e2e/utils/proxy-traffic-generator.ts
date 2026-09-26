/**
 * Генерация трафика через реальный прокси 3proxy.
 *
 * Вместо записи синтетических строк в лог поднимается локальная цель и
 * выполняются настоящие запросы через 3proxy изнутри контейнера. Так тест
 * проверяет весь путь: запрос -> байты в логе 3proxy -> dataUsed в БД.
 *
 * Node.js fetch не умеет прокси, поэтому запросы делает curl, а целевой
 * сервер — обычный http-модуль без зависимостей.
 */
import { execInContainer, execInContainerDetached } from "./helpers.js";

export interface ProxyTrafficStats {
    sent: number;
    received: number;
    requests: number;
    duration: number;
}

export interface ProxyCredentials {
    username: string;
    password: string;
}

// Скрипт передаётся в контейнер в base64: в нём есть кавычки и переводы строк,
// которые нельзя безопасно вложить в sh -c "...".
const TARGET_SERVER_SCRIPT = `
const http = require("http");
const PORT = process.env.TARGET_PORT;
const RESPONSE_BYTES = parseInt(process.env.RESPONSE_BYTES || "65536", 10);
const BODY = Buffer.alloc(RESPONSE_BYTES, 0x61);

http
    .createServer((req, res) => {
        let received = 0;
        req.on("data", (chunk) => {
            received += chunk.length;
        });
        req.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": RESPONSE_BYTES });
            res.end(BODY);
        });
    })
    .listen(PORT, "0.0.0.0", () => {
        console.log("target listening on " + PORT);
    });
`;

export interface LocalTargetOptions {
    port: number;
    responseBytes: number;
}

/** Поднимает локальный HTTP-сервер-цель внутри контейнера. */
export async function startLocalTarget(container: string, options: LocalTargetOptions): Promise<void> {
    const encoded = Buffer.from(TARGET_SERVER_SCRIPT, "utf-8").toString("base64");

    await execInContainer(container, `echo '${encoded}' | base64 -d > /tmp/e2e-target.js`);

    await execInContainerDetached(
        container,
        `TARGET_PORT=${options.port} RESPONSE_BYTES=${options.responseBytes} node /tmp/e2e-target.js > /tmp/e2e-target.log 2>&1`
    );

    // Сервер поднимается мгновенно, но даём ему секунду и проверяем пробой.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const probe = await execInContainer(
        container,
        `curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:${options.port}/ || echo 000`
    );

    if (probe.trim() !== "200") {
        const targetLog = await execInContainer(container, "cat /tmp/e2e-target.log 2>/dev/null || true");

        throw new Error(
            `Local target did not start on port ${options.port} (probe: ${probe.trim()}). Log:\n${targetLog}`
        );
    }
}

export interface HttpTrafficOptions {
    container: string;
    proxyHost: string;
    proxyPort: number;
    targetUrl: string;
    credentials: ProxyCredentials;
    requestCount?: number;
    requestBytes?: number;
}

/**
 * Отправляет requestCount POST-запросов через прокси и возвращает фактически
 * переданные байты (по счётчикам curl).
 */
export async function generateHttpTraffic(options: HttpTrafficOptions): Promise<ProxyTrafficStats> {
    const {
        container,
        proxyHost,
        proxyPort,
        targetUrl,
        credentials,
        requestCount = 5,
        requestBytes = 32 * 1024
    } = options;

    const proxyUrl = `http://${proxyHost}:${proxyPort}`;
    const auth = `${credentials.username}:${credentials.password}`;

    await execInContainer(container, `head -c ${requestBytes} /dev/zero > /tmp/e2e-payload.bin`);

    const startTime = Date.now();
    let sent = 0;
    let received = 0;
    let requests = 0;

    for (let i = 0; i < requestCount; i++) {
        const output = await execInContainer(
            container,
            `curl -s -o /dev/null -w '%{size_upload} %{size_download} %{http_code}' --max-time 10 ` +
                `-x ${proxyUrl} --proxy-user '${auth}' ` +
                `-H 'Content-Type: application/octet-stream' ` +
                `--data-binary @/tmp/e2e-payload.bin ${targetUrl}`
        );

        const [upload = "0", download = "0", status = "000"] = output.trim().split(/\s+/);

        if (status !== "200") {
            throw new Error(`Request ${i + 1}/${requestCount} through proxy failed with status ${status}: ${output}`);
        }

        sent += Number(upload);
        received += Number(download);
        requests++;
    }

    return { sent, received, requests, duration: Date.now() - startTime };
}
