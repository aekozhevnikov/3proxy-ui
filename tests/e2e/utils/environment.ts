/**
 * Общее управление E2E-окружением.
 *
 * Все пути вычисляются от расположения этого файла, поэтому тесты не зависят
 * от абсолютного пути к репозиторию. Состав окружения описан в
 * tests/e2e/docker-compose.e2e.yml (база — docker-compose.dev.yml).
 */
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { spawn } from "child_process";

import { execAsync, execInContainer } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const E2E_DIR = path.resolve(__dirname, "..");
export const COMPOSE_FILE = path.join(E2E_DIR, "docker-compose.e2e.yml");
export const COMPOSE_PROJECT = "3proxy-e2e-test";

/** Каталог логов, который 3proxy и UI монтируют как /etc/3proxy/logs. */
export const RUNTIME_LOGS_DIR = path.join(E2E_DIR, "test-fixtures", "3proxy", "logs");

/** Каталог, который UI монтирует как /etc/3proxy. */
export const RUNTIME_3PROXY_DIR = path.join(E2E_DIR, "test-fixtures", "3proxy");

export const TRAFFIC_SERVICE = "3proxy-ui-e2e";
export const TRAFFIC_CONTAINER = "3proxy-ui-e2e-test";
export const FAIL2BAN_SERVICE = "3proxy-ui-e2e-fail2ban";
export const FAIL2BAN_CONTAINER = "3proxy-ui-e2e-fail2ban";

/** Путь к .proxyauth внутри контейнера (совпадает с PROXYAUTH_PATH в compose). */
export const PROXYAUTH_CONTAINER_PATH = "/etc/3proxy/users/.proxyauth";

/** Путь к логам 3proxy внутри контейнера (совпадает с LOGS_DIR в compose). */
export const LOGS_CONTAINER_DIR = "/etc/3proxy/logs";

/**
 * IP контейнера в compose-сети. 3proxy резолвит имена через собственные
 * n-серверы (nslookup в 3proxy.cfg), а не через Docker DNS, поэтому цель
 * для проксирования нужно указывать по IP.
 */
export async function containerIp(containerName: string): Promise<string> {
    const { stdout } = await execAsync(
        `docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" ${containerName}`
    );

    return stdout.trim();
}

/** Логи контейнера с хоста — единственный надёжный способ прочитать stdout. */
export async function containerLogs(containerName: string, tail?: number): Promise<string> {
    const tailArg = tail === undefined ? "" : `--tail ${tail} `;
    const { stdout } = await execAsync(`docker logs ${tailArg}${containerName} 2>&1`);

    return stdout;
}

/**
 * Состояние синхронизации трафика и содержимое каталога логов — без этого
 * сообщение о падении не объясняет, что именно прочитал maintenance.
 */
export async function dumpTrafficState(containerName: string): Promise<string> {
    const state = await execInContainerSafe(
        containerName,
        "cat /app/.next/standalone/data/traffic-sync.json 2>/dev/null || echo '(no state file)'"
    );
    const logs = await execInContainerSafe(containerName, `ls -la ${LOGS_CONTAINER_DIR} 2>/dev/null`);
    const tail = await containerLogs(containerName, 120);

    return `sync state: ${state.trim()}\nlogs dir:\n${logs.trim()}\ncontainer logs:\n${tail.trim()}`;
}

async function execInContainerSafe(containerName: string, command: string): Promise<string> {
    try {
        return await execInContainer(containerName, command);
    } catch (error) {
        return `(error: ${error instanceof Error ? error.message : String(error)})`;
    }
}

function composeCommand(args: string): string {
    return `docker compose -p ${COMPOSE_PROJECT} -f "${COMPOSE_FILE}" ${args}`;
}

export async function compose(args: string): Promise<string> {
    const { stdout } = await execAsync(composeCommand(args));

    return stdout;
}

/**
 * Выполняет compose-команду, отдавая вывод в stdout теста построчно.
 * execAsync резолвится только в конце процесса, поэтому логи сборки образа
 * выводились бы разом в финале прогона.
 */
export function composeStreamed(args: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(composeCommand(args), { shell: true, stdio: "inherit" });

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();

                return;
            }

            reject(new Error(`docker compose ${args} failed with code ${code}`));
        });
    });
}

/** Вызывать в начале каждого набора: без Docker тесты всё равно не пройдут. */
export async function requireDocker(): Promise<void> {
    try {
        await execAsync("docker --version");
        await execAsync("docker compose version");
    } catch {
        throw new Error("Docker with Compose v2 is required for E2E tests. Please install Docker first.");
    }
}

/**
 * Обнуляет логи и .proxyauth перед прогоном, иначе накопленные байты из
 * предыдущего запуска попадут в dataUsed и сломают проверки лимитов.
 * Файлы очищаются, а не удаляются.
 *
 * Чистится всё содержимое каталога логов, а не только файлы *.log: 3proxy
 * ротирует лог при перезапуске, поэтому там лежат ещё и 3proxy.log.YYYY.MM.DD,
 * которые иначе копятся между прогонами.
 */
export async function resetRuntimeState(): Promise<void> {
    const logsEntries = await readDirOrEmpty(RUNTIME_LOGS_DIR);

    for (const entry of logsEntries) {
        if (entry === ".gitkeep") continue;

        await fs.writeFile(path.join(RUNTIME_LOGS_DIR, entry), "", "utf-8");
    }

    const usersDir = path.join(RUNTIME_3PROXY_DIR, "users");

    for (const entry of await readDirOrEmpty(usersDir)) {
        if (entry === ".gitkeep") continue;

        await fs.writeFile(path.join(usersDir, entry), "", "utf-8");
    }
}

async function readDirOrEmpty(dir: string): Promise<string[]> {
    try {
        return await fs.readdir(dir);
    } catch {
        return [];
    }
}

/**
 * Поднимает сервис с нуля: снимает прежний, чистит логи, собирает и стартует.
 * depends_on-сервис (3proxy) поднимется автоматически.
 *
 * Сборка образа идёт через spawn со stdio: "inherit", иначе весь вывод docker
 * build копился бы в памяти и появился разом в конце прогона.
 */
export async function upService(service: string): Promise<void> {
    await requireDocker();
    // Полный снос с томами: тесту нужна чистая БД, а не состояние прошлого прогона.
    await compose("down -v --remove-orphans 2>/dev/null || true");
    await resetRuntimeState();
    await composeStreamed(`up -d --build ${service}`);
}

export async function downService(service: string): Promise<void> {
    try {
        await compose(`stop ${service} 2>/dev/null || true`);
        await compose(`rm -f ${service} 2>/dev/null || true`);
    } catch (error) {
        console.warn("Cleanup warning:", error instanceof Error ? error.message : String(error));
    }
}

/** Полный снос окружения вместе с томами БД и jail. */
export async function teardown(): Promise<void> {
    await compose("down -v --remove-orphans 2>/dev/null || true");
    await resetRuntimeState();
}
