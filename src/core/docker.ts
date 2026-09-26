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
 * 3proxy container names, in lookup order.
 *
 * PROXY_CONTAINER_NAME is set in docker-compose.dev.yml and docker-compose.yml
 * but was never read: the name was hardcoded, so renaming the container (as the
 * E2E stack does) silently broke config reloads — .proxyauth was never re-read
 * and 3proxy answered 407 to every request.
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
            // Try the next candidate
        }
    }

    return null;
}

export async function get3proxyContainerPid(containerId: string): Promise<number | null> {
    try {
        const { stdout: isRunning } = await dockerExec(`docker inspect --format '{{.State.Running}}' ${containerId}`);

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
    // Restarting a container takes noticeably longer than the 5s default timeout.
    const { stdout } = await dockerExec(`docker restart ${containerId}`, 60000);

    return stdout.trim() || "Container restarted";
}
