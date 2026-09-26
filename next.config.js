import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));

/** @type {import("next").NextConfig} */
const nextConfig = {
    output: "standalone",
    outputFileTracingExcludes: {
        "*": [
            "./screenshots",
            "./3proxy",

            "**/node_modules/**/*.test.*",
            "**/node_modules/**/*.spec.*",
            "**/node_modules/**/*.map",
            "**/node_modules/**/*.md",
            "**/node_modules/**/test/**",
            "**/node_modules/**/tests/**",
            "**/node_modules/**/__tests__/**",
            "**/node_modules/**/examples/**",
            "**/node_modules/**/docs/**",

            "**/node_modules/@img/sharp*/**",
            "**/node_modules/sharp/**",

            "./.taskmaster/**",
            "./.claude/**",
            "./docs/**",
            "./scripts/**",
            "./test/**",
            "./tests/**",
            "./__tests__/**",
            "./**/*.md",
            "./**/*.map",
            "./.env.local",
            "./.env.*.local"
        ]
    },
    env: {
        VERSION: packageJson.version
        // Note: PROXY_DOMAIN, HTTP_PORT, SOCKS_PORT are now runtime-only
        // Client fetches them from /api/proxy-config at runtime
    },
    // The panel displays proxy passwords in the share modal, so an outside site
    // framing it can overlay the copy button and capture a click. frame-ancestors
    // and X-Frame-Options close that; the rest are cheap defaults.
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "no-referrer" },
                    { key: "X-DNS-Prefetch-Control", value: "off" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    {
                        // 'unsafe-inline' is required for the styles Next injects.
                        // Scripts stay restricted to same-origin, which is what
                        // actually limits an injected payload.
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob:",
                            "font-src 'self' data:",
                            "connect-src 'self'",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                            "object-src 'none'"
                        ].join("; ")
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
