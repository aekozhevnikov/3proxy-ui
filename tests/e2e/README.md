# E2E Tests for 3proxy-ui

This directory contains end-to-end tests that verify the complete functionality of the 3proxy-ui system, including:

- Traffic limit enforcement
- Fail2ban IP blocking
- Expiration-based deactivation
- Scheduler operation
- .proxyauth file management

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- The tests will build the Docker image from the project root

## Running Tests

### Quick Start

```bash
# Compile TypeScript
npm run compile

# Run all E2E tests
npm run test:e2e

# Run only fail2ban tests
npm run test:fail2ban
```

### Using the test scripts directly

```bash
cd tests/e2e
npx tsx traffic-limit.test.ts
npx tsx fail2ban-blocking.test.ts
```

## Test Structure

### `traffic-limit.test.ts`

Tests the traffic limit enforcement flow:

1. Creates a user with 100 MB data limit
2. Simulates traffic by writing to 3proxy.log
3. Triggers maintenance endpoint
4. Verifies user is deactivated
5. Verifies .proxyauth file is updated correctly
6. Tests expiration-based deactivation
7. Tests manual maintenance trigger
8. Tests scheduler execution

### `fail2ban-blocking.test.ts`

Tests fail2ban integration:

1. Starts container with fail2ban enabled
2. Verifies fail2ban configuration
3. Generates auth failure logs (407/403) for a test IP
4. Verifies IP gets banned in fail2ban
5. Checks iptables rules are created
6. Tests that legitimate traffic (200/00000) is ignored
7. Verifies auto-unban configuration

## Test Isolation

Each test:
- Creates its own Docker container with unique name
- Uses separate Docker volumes for data, logs, and fail2ban state
- Cleans up all resources in `finally` block
- Uses a dedicated test database

## Environment Variables

Tests use these defaults (override with `tests/e2e/.env.test`):

- `API_URL=http://localhost:3000` - API endpoint
- `DATABASE_URL=file:/app/data/test.db` - Test database
- `JWT_SECRET=test-secret-key-minimum-32-characters-long` - For JWT tokens
- `ENABLE_FAIL2BAN=true` - Enable fail2ban
- `FAIL2BAN_BANTIME=30` - Ban time in seconds (short for testing)
- `FAIL2BAN_FINDTIME=10` - Time window in seconds
- `FAIL2BAN_MAXRETRY=2` - Failure threshold
- `TRAFFIC_SYNC_INTERVAL=*/1 * * * *` - Scheduler interval (every minute)

## Architecture

The tests follow this pattern:

```typescript
async function testName() {
  // 1. Setup (create containers, users, etc.)
  await setupEnvironment();

  // 2. Execute test actions
  const result = await action();

  // 3. Assert expectations
  if (!expectedCondition) {
    throw new Error('Test failed');
  }

  // 4. Cleanup (handled in finally)
}
```

## Troubleshooting

### Port conflicts

If ports 3000, 3128, or 1080 are already in use, modify the port mappings in the test files.

### Container fails to start

Check Docker logs:
```bash
docker logs 3proxy-ui-e2e-test
```

### Fail2ban not banning

- Check that the log format is JSON with proper fields
- Verify failregex pattern in `/etc/fail2ban/filter.d/3proxy-docker.conf`
- Check `/var/log/fail2ban.log` inside container
- Ensure logs are being written to `/etc/3proxy/logs/3proxy.log`

### Tests too slow

Tests include explicit waits for fail2ban processing (5-10 seconds). You can reduce these by:
- Decreasing `FAIL2BAN_FINDTIME` and `FAIL2BAN_MAXRETRY`
- Using `docker exec` to manually trigger fail2ban reload

## CI/CD Integration

To run in GitHub Actions:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build Docker image
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DOCKER_HOST: tcp://docker:2375
```

## Notes

- Tests create real Docker containers and volumes
- Tests are **not** isolated from each other - run sequentially
- Each test cleans up after itself, but if tests crash, run `./cleanup-all.sh` to manually cleanup
- The tests use the production Dockerfile and entrypoint.sh for maximum realism
