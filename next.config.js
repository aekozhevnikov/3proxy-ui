import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

/** @type {import("next").NextConfig} */
const nextConfig = {
    output: "standalone",
    env: {
        VERSION: packageJson.version
        // Note: PROXY_DOMAIN, HTTP_PORT, SOCKS_PORT are now runtime-only
        // Client fetches them from /api/proxy-config at runtime
    }
};

export default nextConfig;
