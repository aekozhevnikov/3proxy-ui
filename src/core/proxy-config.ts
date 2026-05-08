"use client";

// Cache runtime config to avoid repeated API calls
let cachedConfig: { domain: string; httpPort: string; socksPort: string } | null = null;

/**
 * Fetch proxy configuration from server at runtime.
 * This allows changing PROXY_DOMAIN, HTTP_PORT, SOCKS_PORT without rebuilding.
 * During build (NEXT_BUILD=true), returns fallback immediately to avoid fetch attempts.
 */
export async function fetchProxyConfig(): Promise<{ domain: string; httpPort: string; socksPort: string }> {
    if (cachedConfig) return cachedConfig;

    // During image build, don't attempt to fetch - just return fallback
    if (typeof window === "undefined" && process.env.NEXT_BUILD === "true") {
        return {
            domain: process.env.NEXT_PUBLIC_PROXY_DOMAIN || "localhost",
            httpPort: process.env.NEXT_PUBLIC_HTTP_PORT || "3128",
            socksPort: process.env.NEXT_PUBLIC_SOCKS_PORT || "1080"
        };
    }

    try {
        const response = await fetch("/api/proxy-config");

        if (!response.ok) throw new Error("Failed to fetch proxy config");
        const data = await response.json();

        cachedConfig = data;

        return data;
    } catch (error) {
        console.error("Failed to fetch proxy config:", error);

        // Fallback to build-time env vars (for compatibility with static builds)
        return {
            domain: process.env.NEXT_PUBLIC_PROXY_DOMAIN || "localhost",
            httpPort: process.env.NEXT_PUBLIC_HTTP_PORT || "3128",
            socksPort: process.env.NEXT_PUBLIC_SOCKS_PORT || "1080"
        };
    }
}

/**
 * Generate Telegram proxy link with runtime config
 */
export async function generateTelegramLink(
    username: string,
    password: string,
    server?: string,
    port?: number
): Promise<string> {
    const config = await fetchProxyConfig();
    const linkServer = server || config.domain;
    const linkPort = port || Number(config.socksPort);

    return `https://t.me/socks?server=${linkServer}&port=${linkPort}&user=${username}&pass=${encodeURIComponent(password)}`;
}

/**
 * Generate HTTP proxy configuration string
 */
export async function generateHttpConfig(
    username: string,
    password: string,
    server?: string,
    port?: number
): Promise<string> {
    const config = await fetchProxyConfig();
    const linkServer = server || config.domain;
    const linkPort = port || Number(config.httpPort);

    return `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${linkServer}:${linkPort}`;
}

/**
 * Generate SOCKS5 proxy configuration string
 */
export async function generateSocksConfig(
    username: string,
    password: string,
    server?: string,
    port?: number
): Promise<string> {
    const config = await fetchProxyConfig();
    const linkServer = server || config.domain;
    const linkPort = port || Number(config.socksPort);

    return `socks5://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${linkServer}:${linkPort}`;
}

/**
 * Clear cached config (useful for testing or admin config changes)
 */
export function clearProxyConfigCache(): void {
    cachedConfig = null;
}
