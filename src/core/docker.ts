import { exec as execCb } from "child_process";

export const dockerExec = (cmd: string, timeoutMs = 5000): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execCb(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
};

/**
 * Имена контейнера 3proxy, в порядке поиска.
 *
 * PROXY_CONTAINER_NAME задан в docker-compose.dev.yml и docker-compose.yml,
 * но раньше не читался: имя жёстко кодировалось, и переименование контейнера
 * (например в E2E-окружении) молча ломало перезагрузку конфигурации —
 * .proxyauth не перечитывался, и 3proxy отвечал 407 на все запросы.
 */
function containerNameCandidates(): string[] {
    return [process.env.PROXY_CONTAINER_NAME, "3proxy", "vpn-3proxy"].filter((name): name is string => Boolean(name));
}

export async function find3proxyContainer(): Promise<{ id: string; name: string } | null> {
    for (const name of containerNameCandidates()) {
        try {
            const { stdout } = await dockerExec(`docker ps --filter 'name=^${name}$' --format '{{.ID}}\\t{{.Names}}'`);

            const [id, foundName] = stdout.trim().split("\t");

            if (id) {
                return { id, name: foundName || name };
            }
        } catch {
            // Пробуем следующий кандидат
        }
    }

    return null;
}

export async function get3proxyContainerPid(containerId: string): Promise<number | null> {
    try {
        const { stdout: isRunning } = await dockerExec(
            `docker inspect --format '{{.State.Running}}' ${containerId}`
        );

        if (isRunning.trim() !== "true") {
            return null;
        }

        const { stdout } = await dockerExec(`docker inspect --format '{{.State.Pid}}' ${containerId}`);
        const pid = parseInt(stdout.trim());

        return pid === 0 || isNaN(pid) ? null : pid;
    } catch {
        return null;
    }
}

export async function restart3proxyContainer(containerId: string): Promise<string> {
    // Перезапуск контейнера занимает заметно дольше дефолтных 5 секунд.
    const { stdout } = await dockerExec(`docker restart ${containerId}`, 60000);

    return stdout.trim() || "Container restarted";
}
