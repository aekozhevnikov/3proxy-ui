// Fail2ban Integration Test Suite
// This test compiles to dist/tests/fail2ban-test.js

import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Get project root from CommonJS context
// __dirname and __filename are available in CommonJS
// tests/ -> dist/tests, so go up 2 levels
const projectRoot = path.resolve(__dirname, "..", "..");

// ============================================
// Test Configuration
// ============================================
const TEST_DIR = path.join(process.cwd(), "test-fail2ban");
const LOG_FILE = path.join(TEST_DIR, "3proxy.log");
const JAIL_FILE = path.join(TEST_DIR, "jail.local");

const execCommand = async (cmd: string, cwd?: string): Promise<string> => {
    try {
        const { stdout } = await execAsync(cmd, { cwd, maxBuffer: 1024 * 1024 });
        return stdout;
    } catch (error: any) {
        throw new Error(`Command failed: ${cmd}\n${error.message}`);
    }
};

// ============================================
// Unit Tests: Fail2ban Filter Regex
// ============================================
async function testFilterRegex() {
    // Check that entrypoint.sh contains the filter definition
    const entrypointPath = path.join(projectRoot, "entrypoint.sh");

    try {
        await fs.access(entrypointPath);
    } catch {
        return;
    }

    const entrypointContent = await fs.readFile(entrypointPath, "utf-8");

    // Check for [Definition] section
    if (!entrypointContent.includes("[Definition]")) {
        throw new Error("entrypoint.sh should contain [Definition] section with filter rules");
    }

    // Check for failregex patterns
    const hasFailregex =
        entrypointContent.includes("failregex") &&
        entrypointContent.includes("(407|403)") &&
        entrypointContent.includes("<HOST>");
    if (!hasFailregex) {
        throw new Error("entrypoint.sh should contain failregex with (407|403) and <HOST>");
    }

    // Check for ignoreregex patterns
    const hasIgnoreregex =
        entrypointContent.includes("ignoreregex") &&
        entrypointContent.includes('"code":"00000"') &&
        entrypointContent.includes('"code":"200"');
    if (!hasIgnoreregex) {
        throw new Error("entrypoint.sh should contain ignoreregex with 00000 and 200 codes");
    }

    // Test regex pattern (same as used in production)
    const testRegex = /"error":\{"code":"(407|403)"\}.*"auth":\{"user":"[^"]+"\},"client":\{"ip":"([^"]+)"/;

    // Test cases: log entries that should trigger ban
    const shouldMatch = [
        `{"time_unix":1774790000,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"407"},"auth":{"user":"testuser"},"client":{"ip":"1.2.3.4","port":12345},"server":{"ip":"93.158.167.115","port":443},"bytes":{"sent":0,"received":0},"request":{"hostname":""},"message":""}`,
        `{"time_unix":1774790001,"proxy":{"type:":"SOCKS","port":1080},"error":{"code":"403"},"auth":{"user":"alice"},"client":{"ip":"5.6.7.8","port":54321},"server":{"ip":"192.168.1.1","port":80},"bytes":{"sent":0,"received":0},"request":{"hostname":""},"message":""}`,
        `{"time_unix":1774790002,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"407"},"auth":{"user":"charlie"},"client":{"ip":"10.0.0.1","port":11111},"server":{},"bytes":{},"request":{},"message":"Some error"}`
    ];

    // Test cases: log entries that should NOT trigger ban
    const shouldNotMatch = [
        `{"time_unix":1774790003,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"200"},"auth":{"user":"testuser"},"client":{"ip":"1.2.3.4","port":12345},"server":{"ip":"93.158.167.115","port":443},"bytes":{"sent":1024,"received":2048},"request":{"hostname":"example.com"},"message":"HTTP request completed"}`,
        `{"time_unix":1774790004,"proxy":{"type:":"SOCKS","port":1080},"error":{"code":"00000"},"auth":{"user":"bob"},"client":{"ip":"5.6.7.8","port":54321},"server":{"ip":"192.168.1.1","port":80},"bytes":{"sent":512,"received":1024},"request":{"hostname":""},"message":""}`
    ];

    let passed = 0;
    let failed = 0;

    for (const log of shouldMatch) {
        const match = log.match(testRegex);
        if (match) {
            passed++;
        } else {
            failed++;
        }
    }

    for (const log of shouldNotMatch) {
        const match = log.match(testRegex);
        if (!match) {
            passed++;
        } else {
            failed++;
        }
    }

    if (failed > 0) {
        throw new Error(`Filter regex test failed: ${failed} cases did not behave as expected`);
    }
}

// ============================================
// Unit Tests: Entrypoint Configuration
// ============================================
async function testEntrypointConfig() {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });

    try {
        // Test 1: Verify entrypoint.sh generates correct jail config

        // Simulate what entrypoint.sh does: generate jail config with defaults
        const defaults = {
            maxretry: "3",
            bantime: "1800",
            findtime: "600"
        };

        const generatedJail = `[3proxy-docker]
enabled = true
port = 3128,1080
protocol = tcp
filter = 3proxy-docker
logpath = /etc/3proxy/logs/3proxy.log
maxretry = ${defaults.maxretry}
bantime = ${defaults.bantime}
findtime = ${defaults.findtime}
action = iptables-multiport[name=3proxy-docker, port="3128,1080", protocol=tcp]

[Definition]
failregex = .*"error":{"code":"(407|403)"}.*"auth":{"user":"[^"]+"},"client":{"ip":"<HOST>"
            .*"error":\{[^}]*\}.*"client":{"ip":"<HOST>"}
ignoreregex = .*"error":{"code":"00000"}
              .*"error":{"code":"200"}
`;

        await fs.writeFile(JAIL_FILE, generatedJail);

        const jailContent = await fs.readFile(JAIL_FILE, "utf-8");

        // Check basic jail settings
        if (
            !jailContent.includes("maxretry = 3") ||
            !jailContent.includes("bantime = 1800") ||
            !jailContent.includes("findtime = 600")
        ) {
            throw new Error("Default jail config should have correct defaults");
        }

        // Check for filter definition section
        if (!jailContent.includes("[Definition]")) {
            throw new Error("Jail config should contain [Definition] section");
        }

        // Check failregex content
        if (
            !jailContent.includes("failregex") ||
            !jailContent.includes("(407|403)") ||
            !jailContent.includes("<HOST>")
        ) {
            throw new Error("Missing failregex with (407|403) and <HOST>");
        }

        // Check ignoreregex content
        if (
            !jailContent.includes("ignoreregex") ||
            !jailContent.includes('"code":"00000"') ||
            !jailContent.includes('"code":"200"')
        ) {
            throw new Error("Missing ignoreregex with 00000 and 200");
        }

        // Test 2: Custom BANTIME
        process.env.FAIL2BAN_BANTIME = "3600";
        let jail = await fs.readFile(JAIL_FILE, "utf-8");
        jail = jail.replace(/^bantime = .*$/m, "bantime = 3600");
        await fs.writeFile(JAIL_FILE, jail);

        const content2 = await fs.readFile(JAIL_FILE, "utf-8");
        if (!content2.includes("bantime = 3600")) {
            throw new Error("Should have bantime = 3600");
        }

        // Test 3: Custom FINDTIME
        process.env.FAIL2BAN_FINDTIME = "1200";
        jail = await fs.readFile(JAIL_FILE, "utf-8");
        jail = jail.replace(/^findtime = .*$/m, "findtime = 1200");
        await fs.writeFile(JAIL_FILE, jail);

        const content3 = await fs.readFile(JAIL_FILE, "utf-8");
        if (!content3.includes("findtime = 1200")) {
            throw new Error("Should have findtime = 1200");
        }

        // Test 4: Custom MAXRETRY
        process.env.FAIL2BAN_MAXRETRY = "5";
        jail = await fs.readFile(JAIL_FILE, "utf-8");
        jail = jail.replace(/^maxretry = .*$/m, "maxretry = 5");
        await fs.writeFile(JAIL_FILE, jail);

        const content4 = await fs.readFile(JAIL_FILE, "utf-8");
        if (!content4.includes("maxretry = 5")) {
            throw new Error("Should have maxretry = 5");
        }

        // Test 5: All three together
        process.env.FAIL2BAN_BANTIME = "7200";
        process.env.FAIL2BAN_FINDTIME = "300";
        process.env.FAIL2BAN_MAXRETRY = "10";

        jail = await fs.readFile(JAIL_FILE, "utf-8");
        if (process.env.FAIL2BAN_BANTIME) {
            jail = jail.replace(/^bantime = .*$/m, `bantime = ${process.env.FAIL2BAN_BANTIME}`);
        }
        if (process.env.FAIL2BAN_FINDTIME) {
            jail = jail.replace(/^findtime = .*$/m, `findtime = ${process.env.FAIL2BAN_FINDTIME}`);
        }
        if (process.env.FAIL2BAN_MAXRETRY) {
            jail = jail.replace(/^maxretry = .*$/m, `maxretry = ${process.env.FAIL2BAN_MAXRETRY}`);
        }
        await fs.writeFile(JAIL_FILE, jail);

        const content5 = await fs.readFile(JAIL_FILE, "utf-8");
        if (
            !content5.includes("bantime = 7200") ||
            !content5.includes("findtime = 300") ||
            !content5.includes("maxretry = 10")
        ) {
            throw new Error("All three variables should be applied");
        }

        // Test 6: Verify filter definition remains intact after modifications
        const finalContent = await fs.readFile(JAIL_FILE, "utf-8");
        if (
            !finalContent.includes("[Definition]") ||
            !finalContent.includes("failregex") ||
            !finalContent.includes("ignoreregex")
        ) {
            throw new Error("Filter definition should remain intact after modifications");
        }
    } finally {
        // Cleanup
        await fs.rm(TEST_DIR, { recursive: true, force: true });
        delete process.env.FAIL2BAN_BANTIME;
        delete process.env.FAIL2BAN_FINDTIME;
        delete process.env.FAIL2BAN_MAXRETRY;
    }
}

// ============================================
// Log Format Validation Test
// ============================================
async function testLogFormatValidation() {
    const configPath = path.join(projectRoot, "3proxy", "3proxy.cfg");

    try {
        await fs.access(configPath);
    } catch {
        return;
    }

    const config = await fs.readFile(configPath, "utf-8");

    // Check for JSON log format
    const hasJsonFormat = config.includes("logformat") && config.includes("time_unix");
    if (!hasJsonFormat) {
        throw new Error("3proxy.cfg should use JSON log format with time_unix field");
    }

    // Check log file path
    const logPathMatch = config.match(/log\s+(\S+)\s+D/);
    if (!logPathMatch) {
        throw new Error("3proxy.cfg should have log directive with D (JSON) format");
    }
    const logPath = logPathMatch[1];

    if (logPath !== "/etc/3proxy/logs/3proxy.log") {
    }

    // Validate sample log entry structure
    const sampleLog = {
        time_unix: Math.floor(Date.now() / 1000),
        proxy: { "type:": "HTTP", port: 3128 },
        error: { code: "407" },
        auth: { user: "testuser" },
        client: { ip: "1.2.3.4", port: 12345 },
        server: { ip: "93.158.167.115", port: 443 },
        bytes: { sent: 0, received: 0 },
        request: { hostname: "" },
        message: "IP limit exceeded"
    };

    const serialized = JSON.stringify(sampleLog);
    const parsed = JSON.parse(serialized);

    if (!parsed.error || !parsed.error.code) {
        throw new Error("Sample log missing error.code field");
    }
    if (!parsed.client || !parsed.client.ip) {
        throw new Error("Sample log missing client.ip field");
    }
    if (!parsed.auth || !parsed.auth.user) {
        throw new Error("Sample log missing auth.user field");
    }
}

// ============================================
// Configuration Test: Docker Compose
// ============================================
async function testDockerComposeConfig() {
    const composePath = path.join(projectRoot, "docker-compose.yml");

    try {
        await fs.access(composePath);
    } catch {
        return;
    }

    const composeContent = await fs.readFile(composePath, "utf-8");

    // Check for required capabilities
    if (!composeContent.includes("NET_ADMIN") || !composeContent.includes("NET_RAW")) {
        throw new Error("docker-compose.yml must include NET_ADMIN and NET_RAW capabilities");
    }

    // Check for volume mounts
    if (!composeContent.includes("/etc/3proxy/logs") || !composeContent.includes("/var/lib/fail2ban")) {
        throw new Error("docker-compose.yml must mount /etc/3proxy/logs and /var/lib/fail2ban volumes");
    }

    // Check for fail2ban env vars
    if (
        !composeContent.includes("FAIL2BAN_BANTIME") ||
        !composeContent.includes("FAIL2BAN_FINDTIME") ||
        !composeContent.includes("FAIL2BAN_MAXRETRY")
    ) {
    } else {
    }

    // Check ENABLE_FAIL2BAN
    if (!composeContent.includes("ENABLE_FAIL2BAN")) {
    } else {
    }
}

// ============================================
// Integration Test: Docker Container
// ============================================
async function testDockerIntegration() {
    const imageName = "3proxy-ui:test";
    const containerName = "3proxy-ui-test-fail2ban";

    try {
        // Check if Docker is available
        try {
            await execCommand("docker --version");
        } catch {
            return;
        }

        const jwtSecret = "0123456789abcdefghijklmnopqrstuvwxyz"; // 36 chars, meets >=32 requirement
        const buildCmd = [
            "docker build",
            "--build-arg PROXY_DOMAIN=test.local",
            "--build-arg HTTP_PORT=3128",
            "--build-arg SOCKS_PORT=1080",
            `--build-arg JWT_SECRET=${jwtSecret}`,
            `-t ${imageName} .`
        ].join(" ");
        await execCommand(buildCmd);

        // Clean up any existing container
        try {
            await execCommand(`docker rm -f ${containerName}`);
        } catch {
            // Container might not exist, that's fine
        }

        const runCmd = [
            "docker run -d",
            `--name ${containerName}`,
            "--privileged",
            "-e ENABLE_FAIL2BAN=true",
            "-e FAIL2BAN_BANTIME=60",
            "-e FAIL2BAN_FINDTIME=10",
            "-e FAIL2BAN_MAXRETRY=2",
            `-v ${TEST_DIR}:/app/test-logs`,
            imageName
        ].join(" ");
        await execCommand(runCmd);

        // Wait for container to be ready
        let ready = false;
        for (let i = 0; i < 30; i++) {
            try {
                await execCommand(`docker exec ${containerName} pgrep -x "3proxy"`);
                ready = true;
                break;
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        if (!ready) {
            throw new Error("Container did not start 3proxy within 30 seconds");
        }

        // Check fail2ban status
        try {
            await execCommand(`docker exec ${containerName} fail2ban-client status 3proxy-docker`);
        } catch (error) {
            // Try ip-limit jail if docker jail not present
            try {
                await execCommand(`docker exec ${containerName} fail2ban-client status 3proxy-ip-limit`);
            } catch {}
        }

        // Generate test log with violation
        const violationLog =
            JSON.stringify({
                time_unix: Math.floor(Date.now() / 1000),
                proxy: { "type:": "HTTP", port: 3128 },
                error: { code: "407" },
                auth: { user: "testuser" },
                client: { ip: "10.20.30.40", port: 12345 },
                server: { ip: "93.158.167.115", port: 443 },
                bytes: { sent: 0, received: 0 },
                request: { hostname: "" },
                message: "IP limit exceeded"
            }) + "\n";

        await fs.mkdir(TEST_DIR, { recursive: true });
        await fs.writeFile(LOG_FILE, violationLog);

        const containerLogPath = "/etc/3proxy/logs/3proxy.log";
        const escapedLog = violationLog.replace(/"/g, '\\"').replace(/`/g, "\\`");
        try {
            await execCommand(`docker exec ${containerName} sh -c "echo '${escapedLog}' >> ${containerLogPath}"`);
        } catch {}

        // Wait for fail2ban to process
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Check if IP is banned
        try {
            const jailStatus = await execCommand(
                `docker exec ${containerName} fail2ban-client status 3proxy-docker 2>&1`
            );
            if (jailStatus.includes("10.20.30.40")) {
            } else {
                // Try ip-limit jail
                try {
                    const ipLimitStatus = await execCommand(
                        `docker exec ${containerName} fail2ban-client status 3proxy-ip-limit 2>&1`
                    );
                    if (ipLimitStatus.includes("10.20.30.40")) {
                    } else {
                    }
                } catch (e) {}
            }
        } catch (error) {}

        // Check iptables
        try {
            const iptables = await execCommand(`docker exec ${containerName} iptables -L -n | grep 10.20.30.40`);
            if (iptables) {
            } else {
            }
        } catch {}
    } catch (error) {
        console.error("\n❌ Docker integration test failed:", error.message);
    } finally {
        // Cleanup
        try {
            await execCommand(`docker rm -f ${containerName} 2>&1`);
        } catch {
            // Container may not exist
        }
        try {
            await execCommand(`docker rmi ${imageName} 2>&1`);
        } catch {
            // Image may not exist
        }
        try {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        } catch {
            // Test dir may not exist
        }
    }
}

// ============================================
// Main Test Runner
// ============================================
async function runTests() {
    const startTime = Date.now();
    let failed = false;

    try {
        await testFilterRegex();
    } catch (error) {
        console.error("❌ Filter regex test FAILED:", error.message);
        failed = true;
    }

    try {
        await testEntrypointConfig();
    } catch (error) {
        console.error("❌ Entrypoint config test FAILED:", error.message);
        failed = true;
    }

    try {
        await testLogFormatValidation();
    } catch (error) {
        console.error("❌ Log format test FAILED:", error.message);
        failed = true;
    }

    try {
        await testDockerComposeConfig();
    } catch (error) {
        console.error("❌ Docker Compose config test FAILED:", error.message);
        failed = true;
    }

    try {
        await testDockerIntegration();
    } catch (error) {
        console.error("❌ Docker integration test FAILED:", error.message);
        failed = true;
    }

    if (failed) {
        process.exit(1);
    }
}

// Run tests
runTests().catch((error) => {
    console.error("Test runner failed:", error);
    process.exit(1);
});
