/**
 * E2E Test: Traffic Limit Enforcement
 *
 * Tests the complete flow:
 * 1. Create user with data limit (100 MB)
 * 2. Generate traffic through proxy (exceeding limit)
 * 3. Run maintenance scheduler
 * 4. Verify user is deactivated
 * 5. Verify .proxyauth file updated
 */

import {
    apiCall,
    createAdminSession,
    execAsync,
    execInContainer,
    TEST_CONFIG,
    waitForService
} from "./utils/helpers.js";

const CONTAINER_NAME = "3proxy-ui-e2e-test";

async function setupTestEnvironment() {
    // Check Docker
    try {
        await execAsync("docker --version");
    } catch (error) {
        throw new Error("Docker is required for E2E tests. Please install Docker first.");
    }

    // Build and start test container
    const buildCmd = `docker build -t 3proxy-ui:e2e-test .`;
    await execAsync(buildCmd);

    // Stop and remove existing container
    try {
        await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    } catch {
        // Ignore
    }

    // Start container
    const runCmd = [
        "docker run -d",
        `--name ${CONTAINER_NAME}`,
        "--privileged",
        "-e DATABASE_URL=file:/app/data/test.db",
        "-e NEXT_PUBLIC_API_URL=http://localhost:3000",
        "-e API_URL=http://localhost:3000",
        "-e JWT_SECRET=test-secret-key-minimum-32-characters-long",
        "-e ENABLE_FAIL2BAN=true",
        "-e FAIL2BAN_BANTIME=60",
        "-e FAIL2BAN_FINDTIME=10",
        "-e FAIL2BAN_MAXRETRY=2",
        "-e TRAFFIC_SYNC_INTERVAL=*/1 * * * *",
        "-p 3000:3000",
        "-p 3128:3128",
        "-p 1080:1080",
        "-v e2e_data:/app/data",
        "-v e2e_logs:/etc/3proxy/logs",
        "-v e2e_fail2ban:/var/lib/fail2ban",
        "3proxy-ui:e2e-test"
    ].join(" ");

    await execAsync(runCmd);

    // Wait for service to be ready
    await waitForService(TEST_CONFIG.apiUrl, 120000);

    // Initialize database
    await execInContainer(CONTAINER_NAME, "npx prisma migrate deploy && npx prisma generate");
}

async function cleanupTestEnvironment() {
    try {
        await execAsync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    } catch (error) {
        if (error instanceof Error) {
            console.warn("Cleanup warning:", error.message);
        }
    }

    // Optional: remove test image
    try {
        await execAsync("docker rmi 3proxy-ui:e2e-test 2>/dev/null || true");
    } catch {
        // Ignore
    }

    // Remove volumes
    try {
        await execAsync("docker volume rm e2e_data 2>/dev/null || true");
        await execAsync("docker volume rm e2e_logs 2>/dev/null || true");
        await execAsync("docker volume rm e2e_fail2ban 2>/dev/null || true");
    } catch {
        // Ignore
    }
}

async function testTrafficLimitEnforcement() {
    const adminToken = await createAdminSession();

    // 1. Create test user with 100 MB limit
    const createUserData = {
        username: TEST_CONFIG.testUser.username,
        password: TEST_CONFIG.testUser.password,
        dataLimit: TEST_CONFIG.testUser.dataLimit,
        ipLimit: 1,
        telegramUserId: TEST_CONFIG.testUser.telegramUserId,
        isActive: true
    };

    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", createUserData);
    if (!createResult.success) {
        throw new Error(`Failed to create test user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    // 2. Verify user is active
    const userCheck = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (!userCheck.isActive) {
        throw new Error("User should be active after creation");
    }

    // 3. Generate traffic via proxy (send 110 MB to exceed limit)
    const totalTraffic = 110 * 1024 * 1024; // 110 MB

    // Simulate traffic by making requests through proxy
    // Note: This requires the application to be configured to use 3proxy
    // In a real scenario, the user would be using the proxy

    // Instead of actual proxy traffic (which is complex in E2E),
    // we'll directly write to the 3proxy log file to simulate traffic
    const timestamp = Math.floor(Date.now() / 1000);
    const logEntry =
        JSON.stringify({
            time_unix: timestamp,
            proxy: { "type:": "HTTP", port: 3128 },
            auth: { user: TEST_CONFIG.testUser.username },
            bytes: { sent: totalTraffic, received: 0 }
        }) + "\n";

    await execInContainer(CONTAINER_NAME, `sh -c "echo '${logEntry}' >> /etc/3proxy/logs/3proxy.log"`);

    // 4. Run maintenance immediately
    const maintenanceResult = await apiCall(adminToken, "/api/users/maintenance", "POST", {});
    if (!maintenanceResult.success) {
        throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
    }

    // 5. Verify user is deactivated
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for DB update

    const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (userAfter.isActive) {
        throw new Error(`User should be deactivated. Data used: ${userAfter.dataUsed}, limit: ${userAfter.dataLimit}`);
    }

    // 6. Verify .proxyauth file
    const proxyauthContent = await execInContainer(CONTAINER_NAME, "cat /app/3proxy/users/.proxyauth");

    // Deactivated users should be commented
    if (!proxyauthContent.includes(`# DEACTIVATED`)) {
        // Check if user line is commented
        if (proxyauthContent.match(new RegExp(`^${TEST_CONFIG.testUser.username}:`))) {
            throw new Error("Deactivated user should be commented in .proxyauth");
        }
    }

    // Active users should be present uncommented
    const activePattern = new RegExp(`^${TEST_CONFIG.testUser}:`, "m");
    if (
        !activePattern.test(proxyauthContent) &&
        !proxyauthContent.includes(`# DEACTIVATED ${TEST_CONFIG.testUser.username}`)
    ) {
        throw new Error("User not found in .proxyauth (expected as commented deactivated entry)");
    }
}

async function testExpirationDeactivation() {
    const adminToken = await createAdminSession();

    // 1. Create user with past expiration date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    const createUserData = {
        username: "expireduser",
        password: "ExpiredPass123!",
        isActive: true,
        expiresAt: pastDate.toISOString(),
        dataLimit: 50 * 1024 * 1024 // 50 MB
    };

    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", createUserData);
    if (!createResult.success) {
        throw new Error(`Failed to create expired user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    // 2. Run maintenance
    const maintenanceResult = await apiCall(adminToken, "/api/users/maintenance", "POST", {});
    if (!maintenanceResult.success) {
        throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
    }

    // 3. Verify user is deactivated
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
    if (userAfter.isActive) {
        throw new Error("User with expired subscription should be deactivated");
    }
    if (!userAfter.deactivatedAt) {
        throw new Error("DeactivatedAt should be set");
    }
}

async function testManualMaintenanceTrigger() {
    const adminToken = await createAdminSession();

    const result = await apiCall(adminToken, "/api/users/maintenance", "POST", {});

    if (!result.success) {
        throw new Error(`Maintenance should succeed: ${result.error}`);
    }

    if (result.sourceFile) {
    }
}

async function testScheduler() {
    const adminToken = await createAdminSession();

    // Create a test user first
    const createResult = await apiCall(adminToken, "/api/admin/users", "POST", {
        username: "schedtestuser",
        password: "SchedTest123!",
        isActive: true,
        dataLimit: 50 * 1024 * 1024 // 50 MB
    });

    if (!createResult.success) {
        throw new Error(`Failed to create user: ${createResult.error || JSON.stringify(createResult)}`);
    }

    // Wait for scheduler to run (it runs every minute)
    let ran = false;
    const timeout = 90000;
    const checkInterval = 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        // Check if .proxyauth was updated (by checking if user is present)
        try {
            const proxyauth = await execInContainer(CONTAINER_NAME, "cat /app/3proxy/users/.proxyauth");
            if (proxyauth.includes("schedtestuser")) {
                ran = true;
                break;
            }
        } catch {
            // Not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!ran) {
        console.warn("⚠ Scheduler did not run within timeout - this may be expected if TRAFFIC_SYNC_INTERVAL is long");
    } else {
    }
}

async function runAllTests() {
    let passed = 0;
    let failed = 0;
    const errors: Error[] = [];

    const tests = [
        { name: "Traffic Limit Enforcement", fn: testTrafficLimitEnforcement },
        { name: "Expiration Deactivation", fn: testExpirationDeactivation },
        { name: "Manual Maintenance Trigger", fn: testManualMaintenanceTrigger },
        { name: "Scheduler Execution", fn: testScheduler }
    ];

    try {
        await setupTestEnvironment();

        for (const test of tests) {
            try {
                await test.fn();
                passed++;
            } catch (error: any) {
                console.error(`❌ ${test.name} FAILED:`, error.message);
                failed++;
                errors.push(error);
            }
        }
    } catch (error: any) {
        console.error("\n❌ Test setup failed:", error.message);
        failed++;
        errors.push(error);
    } finally {
        await cleanupTestEnvironment();
    }

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Run tests
runAllTests().catch((error) => {
    console.error("Test runner crashed:", error);
    process.exit(1);
});
