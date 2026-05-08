import { promises as fs } from "fs";
import path from "path";
import { clearTrafficCache } from "@src/lib/traffic-parser";

async function testParser() {
    const logsDir = path.join(process.cwd(), "test-logs");

    // Ensure logs exist
    await fs.mkdir(logsDir, { recursive: true });
    // Use JSON format like real 3proxy logs
    const logContent =
        JSON.stringify({
            time_unix: 1774790000,
            proxy: { "type:": "HTTP", port: 8080 },
            auth: { user: "testuser" },
            client: { ip: "192.168.1.100", port: 12345 },
            server: { ip: "93.158.167.115", port: 443 },
            bytes: { sent: 5242880, received: 5242880 },
            request: { hostname: "test.com" },
            message: "HTTP request completed"
        }) + "\n";
    await fs.writeFile(path.join(logsDir, "3proxy.log"), logContent);

    // Parse
    clearTrafficCache();
    process.env.LOGS_DIR = logsDir;

    // Cleanup
    await fs.unlink(path.join(logsDir, "3proxy.log"));
    await fs.rmdir(logsDir);
}

testParser().catch(console.error);
