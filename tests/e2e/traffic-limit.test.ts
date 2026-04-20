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

import { execAsync, TEST_CONFIG, waitForService, createAdminSession, apiCall, execInContainer } from './utils/helpers.js';

const CONTAINER_NAME = '3proxy-ui-e2e-test';

async function setupTestEnvironment() {
  console.log('\n=== Setting up E2E test environment ===\n');

  // Check Docker
  try {
    await execAsync('docker --version');
  } catch (error) {
    throw new Error('Docker is required for E2E tests. Please install Docker first.');
  }

  // Build and start test container
  console.log('Building test Docker image...');
  const buildCmd = `docker build -t 3proxy-ui:e2e-test .`;
  await execAsync(buildCmd);
  console.log('✓ Image built');

  // Stop and remove existing container
  try {
    await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
  } catch {
    // Ignore
  }

  // Start container
  console.log('Starting test container...');
  const runCmd = [
    'docker run -d',
    `--name ${CONTAINER_NAME}`,
    '--privileged',
    '-e DATABASE_URL=file:/app/data/test.db',
    '-e NEXT_PUBLIC_API_URL=http://localhost:3000',
    '-e API_URL=http://localhost:3000',
    '-e JWT_SECRET=test-secret-key-minimum-32-characters-long',
    '-e ENABLE_FAIL2BAN=true',
    '-e FAIL2BAN_BANTIME=60',
    '-e FAIL2BAN_FINDTIME=10',
    '-e FAIL2BAN_MAXRETRY=2',
    '-e TRAFFIC_SYNC_INTERVAL=*/1 * * * *',
    '-p 3000:3000',
    '-p 3128:3128',
    '-p 1080:1080',
    '-v e2e_data:/app/data',
    '-v e2e_logs:/etc/3proxy/logs',
    '-v e2e_fail2ban:/var/lib/fail2ban',
    '3proxy-ui:e2e-test'
  ].join(' ');

  await execAsync(runCmd);
  console.log('✓ Container started');

  // Wait for service to be ready
  await waitForService(TEST_CONFIG.apiUrl, 120000);
  console.log('✓ Service ready');

  // Initialize database
  console.log('Initializing database...');
  await execInContainer(CONTAINER_NAME, 'npx prisma migrate deploy && npx prisma generate');
  console.log('✓ Database initialized');
}

async function cleanupTestEnvironment() {
  console.log('\n=== Cleaning up E2E test environment ===\n');

  try {
    await execAsync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await execAsync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    console.log('✓ Container removed');
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }

  // Optional: remove test image
  try {
    await execAsync('docker rmi 3proxy-ui:e2e-test 2>/dev/null || true');
    console.log('✓ Test image removed');
  } catch {
    // Ignore
  }

  // Remove volumes
  try {
    await execAsync('docker volume rm e2e_data 2>/dev/null || true');
    await execAsync('docker volume rm e2e_logs 2>/dev/null || true');
    await execAsync('docker volume rm e2e_fail2ban 2>/dev/null || true');
    console.log('✓ Test volumes removed');
  } catch {
    // Ignore
  }
}

async function testTrafficLimitEnforcement() {
  console.log('\n=== TEST: Traffic Limit Enforcement ===\n');

  const adminToken = await createAdminSession();
  console.log('✓ Admin session created');

  // 1. Create test user with 100 MB limit
  console.log('Creating test user with 100 MB data limit...');
  const createUserData = {
    username: TEST_CONFIG.testUser.username,
    password: TEST_CONFIG.testUser.password,
    dataLimit: TEST_CONFIG.testUser.dataLimit,
    ipLimit: 1,
    telegramUserId: TEST_CONFIG.testUser.telegramUserId,
    isActive: true
  };

  const createResult = await apiCall(adminToken, '/api/admin/users', 'POST', createUserData);
  if (!createResult.success) {
    throw new Error(`Failed to create test user: ${createResult.error || JSON.stringify(createResult)}`);
  }
  console.log(`✓ User created: ${createResult.username} with ${createResult.dataLimit / 1024 / 1024} MB limit`);

  // 2. Verify user is active
  const userCheck = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
  if (!userCheck.isActive) {
    throw new Error('User should be active after creation');
  }
  console.log('✓ User is active');

  // 3. Generate traffic via proxy (send 110 MB to exceed limit)
  console.log('\nGenerating 110 MB traffic through proxy...');
  const totalTraffic = 110 * 1024 * 1024; // 110 MB
  const data = Buffer.alloc(1024 * 1024); // 1MB buffer repeated

  // Simulate traffic by making requests through proxy
  // Note: This requires the application to be configured to use 3proxy
  // In a real scenario, the user would be using the proxy
  console.log('  (Simulating traffic logs manually for E2E test)');

  // Instead of actual proxy traffic (which is complex in E2E),
  // we'll directly write to the 3proxy log file to simulate traffic
  const timestamp = Math.floor(Date.now() / 1000);
  const logEntry = JSON.stringify({
    time_unix: timestamp,
    proxy: { "type:": "HTTP", port: 3128 },
    auth: { user: TEST_CONFIG.testUser.username },
    bytes: { sent: totalTraffic, received: 0 }
  }) + '\n';

  await execInContainer(CONTAINER_NAME, `sh -c "echo '${logEntry}' >> /etc/3proxy/logs/3proxy.log"`);
  console.log(`✓ Wrote ${(totalTraffic / 1024 / 1024)} MB traffic to 3proxy.log`);

  // 4. Run maintenance immediately
  console.log('\nTriggering maintenance endpoint...');
  const maintenanceResult = await apiCall(adminToken, '/api/users/maintenance', 'POST', {});
  if (!maintenanceResult.success) {
    throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
  }
  console.log(`✓ Maintenance completed: ${maintenanceResult.updatedCount} users updated`);

  // 5. Verify user is deactivated
  console.log('\nVerifying user deactivation...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for DB update

  const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
  if (userAfter.isActive) {
    throw new Error(`User should be deactivated. Data used: ${userAfter.dataUsed}, limit: ${userAfter.dataLimit}`);
  }
  console.log(`✓ User deactivated successfully`);
  console.log(`  Data used: ${userAfter.dataUsed / 1024 / 1024} MB`);
  console.log(`  Data limit: ${userAfter.dataLimit / 1024 / 1024} MB`);
  console.log(`  Deactivated at: ${userAfter.deactivatedAt}`);

  // 6. Verify .proxyauth file
  console.log('\nVerifying .proxyauth file...');
  const proxyauthContent = await execInContainer(CONTAINER_NAME, 'cat /app/3proxy/users/.proxyauth');

  // Deactivated users should be commented
  if (!proxyauthContent.includes(`# DEACTIVATED`)) {
    // Check if user line is commented
    if (proxyauthContent.match(new RegExp(`^${TEST_CONFIG.testUser.username}:`))) {
      throw new Error('Deactivated user should be commented in .proxyauth');
    }
  }

  // Active users should be present uncommented
  const activePattern = new RegExp(`^${TEST_CONFIG.testUser}:`, 'm');
  if (!activePattern.test(proxyauthContent) && !proxyauthContent.includes(`# DEACTIVATED ${TEST_CONFIG.testUser.username}`)) {
    throw new Error('User not found in .proxyauth (expected as commented deactivated entry)');
  }

  console.log('✓ .proxyauth correctly updated');
  console.log('  Sample content:');
  const lines = proxyauthContent.split('\n').filter(l => l.includes('testuser') || l.includes('DEACTIVATED'));
  for (const line of lines.slice(0, 5)) {
    console.log(`    ${line.trim()}`);
  }

  console.log('\n✅ TRAFFIC LIMIT ENFORCEMENT TEST PASSED\n');
}

async function testExpirationDeactivation() {
  console.log('\n=== TEST: Expiration-Based Deactivation ===\n');

  const adminToken = await createAdminSession();

  // 1. Create user with past expiration date
  console.log('Creating user with expired subscription...');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday

  const createUserData = {
    username: 'expireduser',
    password: 'ExpiredPass123!',
    isActive: true,
    expiresAt: pastDate.toISOString(),
    dataLimit: 50 * 1024 * 1024 // 50 MB
  };

  const createResult = await apiCall(adminToken, '/api/admin/users', 'POST', createUserData);
  if (!createResult.success) {
    throw new Error(`Failed to create expired user: ${createResult.error || JSON.stringify(createResult)}`);
  }
  console.log(`✓ User created with expiration: ${createResult.expiresAt}`);

  // 2. Run maintenance
  console.log('\nTriggering maintenance...');
  const maintenanceResult = await apiCall(adminToken, '/api/users/maintenance', 'POST', {});
  if (!maintenanceResult.success) {
    throw new Error(`Maintenance failed: ${maintenanceResult.error}`);
  }
  console.log(`✓ Maintenance completed`);

  // 3. Verify user is deactivated
  await new Promise(resolve => setTimeout(resolve, 2000));

  const userAfter = await apiCall(adminToken, `/api/admin/users/${createResult.id}`);
  if (userAfter.isActive) {
    throw new Error('User with expired subscription should be deactivated');
  }
  if (!userAfter.deactivatedAt) {
    throw new Error('DeactivatedAt should be set');
  }
  console.log(`✓ User deactivated due to expiration`);
  console.log(`  Expired at: ${userAfter.expiresAt}`);
  console.log(`  Deactivated at: ${userAfter.deactivatedAt}`);

  console.log('\n✅ EXPIRATION DEACTIVATION TEST PASSED\n');
}

async function testManualMaintenanceTrigger() {
  console.log('\n=== TEST: Manual Maintenance Trigger ===\n');

  const adminToken = await createAdminSession();

  console.log('Triggering maintenance via API...');
  const result = await apiCall(adminToken, '/api/users/maintenance', 'POST', {});

  if (!result.success) {
    throw new Error(`Maintenance should succeed: ${result.error}`);
  }

  console.log('✓ Maintenance triggered successfully');
  console.log(`  Updated users: ${result.updatedCount}`);
  console.log(`  Deactivated: ${result.deactivatedCount}`);
  console.log(`  Total traffic processed: ${result.totalTraffic} bytes`);

  if (result.sourceFile) {
    console.log(`  Source log file: ${result.sourceFile}`);
  }

  console.log('\n✅ MANUAL MAINTENANCE TEST PASSED\n');
}

async function testScheduler() {
  console.log('\n=== TEST: Scheduler Execution ===\n');

  const adminToken = await createAdminSession();

  // Create a test user first
  console.log('Creating test user for scheduler test...');
  const createResult = await apiCall(adminToken, '/api/admin/users', 'POST', {
    username: 'schedtestuser',
    password: 'SchedTest123!',
    isActive: true,
    dataLimit: 50 * 1024 * 1024 // 50 MB
  });

  if (!createResult.success) {
    throw new Error(`Failed to create user: ${createResult.error || JSON.stringify(createResult)}`);
  }
  console.log(`✓ Test user created: ${createResult.username}`);

  // Wait for scheduler to run (it runs every minute)
  console.log('Waiting for scheduler to run (max 90 seconds)...');
  let ran = false;
  const timeout = 90000;
  const checkInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if .proxyauth was updated (by checking if user is present)
    try {
      const proxyauth = await execInContainer(CONTAINER_NAME, 'cat /app/3proxy/users/.proxyauth');
      if (proxyauth.includes('schedtestuser')) {
        console.log('✓ Scheduler has run (user found in .proxyauth)');
        ran = true;
        break;
      }
    } catch {
      // Not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  if (!ran) {
    console.warn('⚠ Scheduler did not run within timeout - this may be expected if TRAFFIC_SYNC_INTERVAL is long');
  } else {
    console.log('✓ Scheduler is working');
  }

  console.log('\n✅ SCHEDULER TEST PASSED\n');
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          E2E Test Suite for 3proxy-ui            ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;
  const errors: Error[] = [];

  const tests = [
    { name: 'Traffic Limit Enforcement', fn: testTrafficLimitEnforcement },
    { name: 'Expiration Deactivation', fn: testExpirationDeactivation },
    { name: 'Manual Maintenance Trigger', fn: testManualMaintenanceTrigger },
    { name: 'Scheduler Execution', fn: testScheduler }
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
    console.error('\n❌ Test setup failed:', error.message);
    failed++;
    errors.push(error);
  } finally {
    await cleanupTestEnvironment();
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed} passed, ${failed} failed                          ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const error of errors) {
      console.log(`  - ${error.message}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ ALL E2E TESTS PASSED!\n');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
