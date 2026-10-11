/**
 * @jest-environment node
 */
import { exec } from "child_process";

jest.mock("child_process", () => ({
    exec: jest.fn()
}));

const execMock = exec as unknown as jest.Mock;

/** Which container each lookup finds: filter name -> docker ps stdout. */
function mockDockerPs(found: Record<string, string>): void {
    execMock.mockImplementation((command: string, _options: unknown, callback: Function) => {
        const match = command.match(/--filter 'name=\^(.+?)\$'/);

        if (!match) {
            callback(new Error("unexpected command"), "", "");

            return;
        }

        callback(null, found[match[1]] || "", "");
    });
}

async function loadDockerModule(containerName?: string): Promise<typeof import("@/src/core/docker")> {
    if (containerName) {
        process.env.PROXY_CONTAINER_NAME = containerName;
    } else {
        delete process.env.PROXY_CONTAINER_NAME;
    }

    return import("@/src/core/docker");
}

describe("find3proxyContainer", () => {
    afterEach(() => {
        delete process.env.PROXY_CONTAINER_NAME;
        jest.clearAllMocks();
    });

    it("uses PROXY_CONTAINER_NAME when it is set", async () => {
        mockDockerPs({ "custom-3proxy": "abc123\tcustom-3proxy" });

        const { find3proxyContainer } = await loadDockerModule("custom-3proxy");

        await expect(find3proxyContainer()).resolves.toEqual({ id: "abc123", name: "custom-3proxy" });
    });

    it("falls back to the default name when the env var is not set", async () => {
        mockDockerPs({ "3proxy": "def456\t3proxy" });

        const { find3proxyContainer } = await loadDockerModule();

        await expect(find3proxyContainer()).resolves.toEqual({ id: "def456", name: "3proxy" });
    });

    it("falls back to vpn-3proxy when 3proxy is absent", async () => {
        mockDockerPs({ "vpn-3proxy": "ghi789\tvpn-3proxy" });

        const { find3proxyContainer } = await loadDockerModule();

        await expect(find3proxyContainer()).resolves.toEqual({ id: "ghi789", name: "vpn-3proxy" });
    });

    it("returns null when no container matches", async () => {
        mockDockerPs({});

        const { find3proxyContainer } = await loadDockerModule();

        await expect(find3proxyContainer()).resolves.toBeNull();
    });

    it("returns null when the docker command fails for every candidate", async () => {
        execMock.mockImplementation((_command: string, _options: unknown, callback: Function) => {
            callback(new Error("docker unavailable"), "", "");
        });

        const { find3proxyContainer } = await loadDockerModule("custom-3proxy");

        await expect(find3proxyContainer()).resolves.toBeNull();
    });
});
