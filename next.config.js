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
    }
};

export default nextConfig;
