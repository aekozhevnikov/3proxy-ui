export { mocked } from '@/tests/unit/test-utils/mock-helpers';

export const mockLogLine = JSON.stringify({
    time_unix: 1710000000,
    proxy: { type: "HTTP", port: 3128 },
    error: { code: "0" },
    auth: { user: "testuser" },
    client: { ip: "192.168.1.1", port: 12345 },
    server: { ip: "93.158.167.115", port: 443 },
    bytes: { sent: 1024, received: 2048 },
    request: { hostname: "example.com" },
    message: "OK",
});

export const mockLogLine2 = JSON.stringify({
    time_unix: 1710003600,
    proxy: { type: "SOCKS", port: 1080 },
    error: { code: "0" },
    auth: { user: "otheruser" },
    client: { ip: "192.168.1.2", port: 54321 },
    server: { ip: "10.0.0.1", port: 80 },
    bytes: { sent: 4096, received: 8192 },
    request: { hostname: "test.com" },
    message: "OK",
});

export const mockLogLineWithAuth = JSON.stringify({
    time_unix: 1710007200,
    proxy: { type: "HTTP", port: 3128 },
    error: { code: "407" },
    auth: { user: "authuser" },
    client: { ip: "192.168.1.3", port: 9999 },
    server: { ip: "93.158.167.115", port: 443 },
    bytes: { sent: 0, received: 0 },
    request: { hostname: "" },
    message: "Proxy authentication required",
});

export const setupBaseMocks = (mocked: {
    fs: {
        existsSync: jest.Mock;
        readdirSync: jest.Mock;
        readFileSync: jest.Mock;
        statSync: jest.Mock;
    };
    path: {
        join: jest.Mock;
    };
}) => {
    mocked.fs.existsSync.mockReturnValue(true);
    mocked.fs.readdirSync.mockReturnValue([
        "3proxy.log.2024.03.10",
        "3proxy.log.2024.03.09",
    ]);
    mocked.fs.readFileSync.mockReturnValue(`${mockLogLine}\n${mockLogLine2}`);
    mocked.fs.statSync.mockReturnValue({ size: 1024 });
    mocked.path.join.mockImplementation((...args: string[]) => args.join("/"));
};
