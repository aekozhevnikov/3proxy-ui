export { mocked } from "@/tests/unit/test-utils/mock-helpers";

export const mockLogLine = JSON.stringify({
    time_unix: 1710000000,
    proxy: { type: "HTTP", port: 3128 },
    error: { code: "0" },
    auth: { user: "testuser" },
    client: { ip: "192.168.1.1", port: 12345 },
    server: { ip: "93.158.167.115", port: 443 },
    bytes: { sent: 1024, received: 2048 },
    request: { hostname: "example.com" },
    message: "OK"
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
    message: "OK"
});
