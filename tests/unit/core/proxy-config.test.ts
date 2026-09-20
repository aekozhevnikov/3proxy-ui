import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
import {
    fetchProxyConfig,
    generateHttpsConfig,
    generateHttpConfig,
    generateSocksConfig,
    clearProxyConfigCache,
} from "@/src/core/proxy-config";

describe("proxy-config", () => {
    beforeEach(() => {
        clearProxyConfigCache();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("fetchProxyConfig", () => {
        it("returns cached config on subsequent calls", async () => {
            const mockConfig = {
                domain: "test.example.com",
                httpPort: "8080",
                socksPort: "1080",
            };

            mocked(global.fetch).mockResolvedValueOnce(mockResponse(mockConfig));

            const result1 = await fetchProxyConfig();
            const result2 = await fetchProxyConfig();

            expect(result1).toEqual(mockConfig);
            expect(result2).toEqual(mockConfig);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it("returns config from API on first call", async () => {
            const mockConfig = {
                domain: "proxy.example.com",
                httpPort: "3128",
                socksPort: "1080",
            };

            mocked(global.fetch).mockResolvedValueOnce(mockResponse(mockConfig));

            const result = await fetchProxyConfig();
            expect(result).toEqual(mockConfig);
            expect(global.fetch).toHaveBeenCalledWith("/api/proxy-config");
        });

        it("returns fallback config on API failure", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse({}, { ok: false }));

            const result = await fetchProxyConfig();
            expect(result).toHaveProperty("domain");
            expect(result).toHaveProperty("httpPort");
            expect(result).toHaveProperty("socksPort");
        });

        it("returns fallback config on network error", async () => {
            mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

            const result = await fetchProxyConfig();
            expect(result).toHaveProperty("domain");
            expect(result).toHaveProperty("httpPort");
            expect(result).toHaveProperty("socksPort");
        });
    });

    describe("generateHttpsConfig", () => {
        it("generates HTTPS config string with encoded credentials", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse({
                domain: "proxy.example.com",
                httpPort: "443",
                socksPort: "1080",
            }));

            const result = await generateHttpsConfig("user@test", "p@ss w0rd");
            expect(result).toContain("https://");
            expect(result).toContain("proxy.example.com:443");
            expect(result).toContain(encodeURIComponent("user@test"));
            expect(result).toContain(encodeURIComponent("p@ss w0rd"));
        });

        it("uses custom server and port when provided", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse({
                domain: "default.com",
                httpPort: "443",
                socksPort: "1080",
            }));

            const result = await generateHttpsConfig("user", "pass", "custom.host", 8443);
            expect(result).toContain("custom.host:8443");
        });
    });

    describe("generateHttpConfig", () => {
        it("generates HTTP config string", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse({
                domain: "proxy.example.com",
                httpPort: "3128",
                socksPort: "1080",
            }));

            const result = await generateHttpConfig("user", "pass");
            expect(result).toContain("http://");
            expect(result).toContain("proxy.example.com");
            expect(result).toContain(":3128");
            expect(result).toContain(encodeURIComponent("user"));
            expect(result).toContain(encodeURIComponent("pass"));
        });
    });

    describe("generateSocksConfig", () => {
        it("generates SOCKS5 config string", async () => {
            mocked(global.fetch).mockResolvedValueOnce(mockResponse({
                domain: "proxy.example.com",
                httpPort: "3128",
                socksPort: "1080",
            }));

            const result = await generateSocksConfig("user", "pass");
            expect(result).toContain("socks5://");
            expect(result).toContain("proxy.example.com");
            expect(result).toContain(":1080");
            expect(result).toContain(encodeURIComponent("user"));
            expect(result).toContain(encodeURIComponent("pass"));
        });
    });

    describe("clearProxyConfigCache", () => {
        it("clears cache so next call fetches from API", async () => {
            mocked(global.fetch).mockResolvedValue(mockResponse({
                domain: "test.com",
                httpPort: "8080",
                socksPort: "1080",
            }));

            await fetchProxyConfig();
            await fetchProxyConfig();
            expect(global.fetch).toHaveBeenCalledTimes(1);

            clearProxyConfigCache();

            await fetchProxyConfig();
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});
