# E2E Tests for 3proxy-ui

This directory contains end-to-end tests that verify the complete functionality of the 3proxy-ui system, including:

- Real traffic through 3proxy and its recording in the database
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

# Run only the traffic suite
npm run test:e2e -- traffic

# Run only fail2ban tests
npm run test:e2e:fail2ban
```

### Using the runners directly

```bash
# Unified runner
npx tsx tests/e2e/index.ts [traffic|fail2ban|all]

# Individual suites
npx tsx tests/e2e/traffic-limit/run-all.test.ts
npx tsx tests/e2e/fail2ban-blocking/run-all.test.ts
```

Each runner prints `PASS`/`FAIL` per test and exits non-zero if any test failed.
`tests/e2e/traffic-limit.test.ts` and `tests/e2e/fail2ban-blocking.test.ts` are thin
entry points kept for `npm run test:e2e` and `verify-setup.sh`; the tests themselves
live in the subdirectories.

## Environment

The stack is defined in `docker-compose.e2e.yml`, which mirrors `docker-compose.dev.yml`
(same services, environment variables and volumes) with test-specific values. The build
context is relative to the compose file, so the tests do not depend on an absolute
repository path.

Both UI services publish port 3000 and are therefore never started at the same time:

| Service | Compose service | Used by |
| --- | --- | --- |
| Traffic, limits, scheduler | `3proxy-ui-e2e` | `traffic-limit/` |
| fail2ban banning | `3proxy-ui-e2e-fail2ban` | `fail2ban-blocking/` |

Test-specific environment values:

- `DATABASE_URL=file:/app/data/e2e.db` (and `fail2ban.db` for the fail2ban service)
- `JWT_SECRET=test-secret-key-minimum-32-characters-long`
- `TRAFFIC_SYNC_INTERVAL=*/2 * * * *` - scheduler fires every two seconds (production
  default is every 30 minutes)
- `FAIL2BAN_MAXRETRY=2`, `FAIL2BAN_BANTIME=30`, `FAIL2BAN_FINDTIME=10`

`utils/environment.ts` owns the compose lifecycle: paths are derived from the module
location, logs and `.proxyauth` are reset before each run, and `teardown()` removes the
volumes.

## Test Structure

### `traffic-limit/`

1. `real-proxy-traffic-test.ts` - sends real requests through 3proxy to a local target and
   verifies the log entry and `dataUsed` in the database
2. `traffic-limit-enforcement.test.ts` - user with a 100 MB limit exceeds it, gets deactivated
   and is commented out in `.proxyauth`
3. `expiration-deactivation.test.ts` - user past `expiresAt` is deactivated
4. `manual-maintenance-test.ts` - `POST /api/users/maintenance` response contract
5. `scheduler-test.ts` - the scheduler syncs traffic without a manual trigger

### `fail2ban-blocking/`

1. `regex-validation.test.ts` - filter matches 407/403 and ignores 00000/200
2. `jail-configuration.test.ts` - generated jail matches the environment values
3. `auth-failure-banning.test.ts` - repeated auth failures ban the IP and create an iptables rule
4. `legitimate-traffic-ignored.test.ts` - successful requests never ban the IP

### Fixtures

- `test-fixtures/logs/` - static 3proxy logs in the real `logformat` (current file plus a
  rotated `3proxy.log.YYYY.MM.DD`) used by the integration tests
- `test-fixtures/3proxy/` - 3proxy config and runtime directories mounted by the E2E stack

## Test Isolation

- Each suite brings the stack down with its volumes before starting, so the database is empty
- `resetRuntimeState()` truncates `test-fixtures/3proxy/logs/*.log` and `.proxyauth`, so traffic
  from a previous run cannot leak into `dataUsed`
- Suites run sequentially and never share a stack (both UI services need port 3000)
- `cleanup()` runs in a `finally` block; `./cleanup-all.sh` removes anything left behind

Note that the maintenance route re-reads the newest log file on every run, so a log entry is
added to `dataUsed` again on each maintenance cycle. Tests therefore assert monotonic
properties (`dataUsed >= limit`, `dataUsed` increased) rather than exact byte totals.

## Architecture

Test modules export a single `test*` function and do not run on import; the suite runner
awaits them one by one, counts the failures and sets the process exit code:

```typescript
export async function testName(): Promise<void> {
  const result = await action();

  if (!expectedCondition) {
    throw new Error("Test failed");
  }
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
