/**
 * Shared E2E environment control.
 *
 * All paths are derived from the location of this file, so the tests do not
 * depend on an absolute repository path. The stack is described in
 * tests/e2e/docker-compose.e2e.yml (based on docker-compose.dev.yml).
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

/** Log directory mounted by 3proxy and the UI as /etc/3proxy/logs. */
export const RUNTIME_LOGS_DIR = path.join(E2E_DIR, "test-fixtures", "3proxy", "logs");

/** Directory the UI mounts as /etc/3proxy. */
export const RUNTIME_3PROXY_DIR = path.join(E2E_DIR, "test-fixtures", "3proxy");

export const TRAFFIC_SERVICE = "3proxy-ui-e2e";
export const TRAFFIC_CONTAINER = "3proxy-ui-e2e-test";
export const FAIL2BAN_SERVICE = "3proxy-ui-e2e-fail2ban";
export const FAIL2BAN_CONTAINER = "3proxy-ui-e2e-fail2ban";
/** The 3proxy container: it creates the log files, so we reset state through it. */
export const PROXY_CONTAINER = "3proxy-e2e-3proxy";

/** Path to .proxyauth inside the container (matches PROXYAUTH_PATH in compose). */
export const PROXYAUTH_CONTAINER_PATH = "/etc/3proxy/users/.proxyauth";

/** Path to the 3proxy logs inside the container (matches LOGS_DIR in compose). */
export const LOGS_CONTAINER_DIR = "/etc/3proxy/logs";

/** Directory with 3proxy credentials inside the container. */
export const USERS_CONTAINER_DIR = "/etc/3proxy/users";

/**
 * Container IP on the compose network. 3proxy resolves names through its own
 * n-servers (nslookup in 3proxy.cfg), not through Docker DNS, so the proxy
 * target has to be given by IP.
 */
export async function containerIp(containerName: string): Promise<string> {
    const { stdout } = await execAsync(
        `docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" ${containerName}`
    );

    return stdout.trim();
}

/** Container logs from the host - the only reliable way to read stdout. */
export async function containerLogs(containerName: string, tail?: number): Promise<string> {
    const tailArg = tail === undefined ? "" : `--tail ${tail} `;
    const { stdout } = await execAsync(`docker logs ${tailArg}${containerName} 2>&1`);

    return stdout;
}

/**
 * Traffic sync state and the contents of the log directory - without these
 * a failure message does not explain what maintenance actually read.
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
 * Runs a compose command, streaming its output to the test stdout line by line.
 * execAsync only resolves at the end of the process, so image build logs would
 * otherwise appear all at once at the end of the run.
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

/** Call at the start of each suite: without Docker the tests cannot pass anyway. */
export async function requireDocker(): Promise<void> {
    try {
        await execAsync("docker --version");
        await execAsync("docker compose version");
    } catch {
        throw new Error("Docker with Compose v2 is required for E2E tests. Please install Docker first.");
    }
}

/**
 * Truncates the logs and .proxyauth, otherwise bytes accumulated by a
 * previous run land in dataUsed and break the limit checks. Files are
 * truncated, not deleted.
 *
 * Everything in the log directory is truncated, not just *.log files:
 * 3proxy rotates its log on restart, so 3proxy.log.YYYY.MM.DD files are
 * there too and would otherwise pile up between runs.
 *
 * 3proxy creates the files inside the container and on CI they belong to
 * root, while the working copy belongs to the runner user. So we clean from
 * inside the container, where the permissions are enough, and from the host
 * only as a fallback without failing on refusal: resetting state must not
 * break the run.
 */
export async function resetRuntimeState(): Promise<void> {
    try {
        await execInContainer(
            PROXY_CONTAINER,
            `for f in ${LOGS_CONTAINER_DIR}/3proxy.log*; do [ -f "$f" ] && : > "$f"; done; ` +
                `mkdir -p ${USERS_CONTAINER_DIR} && : > ${PROXYAUTH_CONTAINER_PATH}`
        );

        return;
    } catch {
        // Container is not up or does not grant access - fall back to the host
    }

    await truncateOnHost(RUNTIME_LOGS_DIR);
    await truncateOnHost(path.join(RUNTIME_3PROXY_DIR, "users"));
}

async function truncateOnHost(dir: string): Promise<void> {
    for (const entry of await readDirOrEmpty(dir)) {
        if (entry === ".gitkeep") continue;

        try {
            await fs.writeFile(path.join(dir, entry), "", "utf-8");
        } catch (error) {
            console.warn(
                `[e2e] Failed to truncate ${path.join(dir, entry)}: ` +
                    `${error instanceof Error ? error.message : String(error)}`
            );
        }
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
 * Brings the service up from scratch: tears the previous one down, resets
 * state, builds and starts. The depends_on service (3proxy) starts too.
 *
 * The image build runs through spawn with stdio: "inherit", otherwise all
 * docker build output would be buffered and appear in one go at the end.
 */
export async function upService(service: string): Promise<void> {
    await requireDocker();
    // Full teardown including volumes: the test needs a clean database, not last run's state.
    await compose("down -v --remove-orphans 2>/dev/null || true");
    await composeStreamed(`up -d --build ${service}`);
    // Reset after start: the log files belong to 3proxy inside the container and
    // only it can truncate them. No traffic has flowed yet, so the exact
    // moment does not matter, what matters is that it happens before the checks.
    await resetRuntimeState();
}

export async function downService(service: string): Promise<void> {
    try {
        await compose(`stop ${service} 2>/dev/null || true`);
        await compose(`rm -f ${service} 2>/dev/null || true`);
    } catch (error) {
        console.warn("Cleanup warning:", error instanceof Error ? error.message : String(error));
    }
}

/** Full teardown of the environment including the database and jail volumes. */
export async function teardown(): Promise<void> {
    await compose("down -v --remove-orphans 2>/dev/null || true");
    await resetRuntimeState();
}
