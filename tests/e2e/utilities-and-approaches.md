# E2E Testing Strategy for 3proxy-ui

This document explains the testing approaches used in the E2E test suite.

## Test Types

### 1. Traffic Limit Tests (`traffic-limit.test.ts`)

Tests the complete flow of traffic monitoring and user deactivation.

#### What's tested:

1. **User creation with data limits**
   - Creates user via API with 100 MB limit
   - Verifies user is active

2. **Traffic accumulation**
   - Simulates traffic by writing JSON logs directly to 3proxy.log
   - Generates 110 MB to exceed 100 MB limit
   - Uses realistic log format matching 3proxy JSON output

3. **Maintenance execution**
   - Triggers `/api/users/maintenance` endpoint
   - Verifies maintenance succeeds

4. **Deactivation verification**
   - Checks user.isActive === false in database
   - Verifies deactivatedAt timestamp is set
   - Confirms dataUsed exceeds limit

5. **.proxyauth file update**
   - Verifies deactivated user is commented out
   - Ensures file format is correct

6. **Expiration-based deactivation**
   - Creates user with yesterday's expiration date
   - Runs maintenance
   - Verifies deactivation

7. **Manual maintenance trigger**
   - Tests API endpoint directly

8. **Scheduler verification**
   - Waits for automatic scheduler to run
   - Checks .proxyauth is updated periodically

#### Why we write logs directly instead of making real proxy requests:

- **Reliability**: Writing logs is deterministic and doesn't depend on proxy configuration
- **Speed**: No need to transfer large files through actual network
- **Isolation**: Test only the maintenance logic, not 3proxy itself
- **Realism**: The logs use the exact JSON format that 3proxy produces

In a production environment, 3proxy writes these logs automatically as users consume traffic.

### 2. Fail2ban Blocking Tests (`fail2ban-blocking.test.ts`)

Tests the fail2ban integration for IP blocking.

#### What's tested:

1. **Configuration validation**
   - Verifies jail configuration in `/etc/fail2ban/jail.d/3proxy-docker.local`
   - Checks ports (3128, 1080)
   - Confirms bantime, findtime, maxretry values
   - Validates log path

2. **Regex pattern testing**
   - Ensures filter regex matches 407/403 errors
   - Confirms <HOST> placeholder captures IP
   - Verifies ignoreregex excludes 00000 and 200 codes

3. **Auth failure banning**
   - Writes 2 log entries with codes 407 and 403
   - Waits for fail2ban to process (10 seconds)
   - Verifies IP appears in `fail2ban-client status`
   - Checks iptables rules are created

4. **Legitimate traffic ignored**
   - Writes multiple 200 and 00000 log entries
   - Confirms IP is NOT banned

5. **Automatic unban configuration**
   - Verifies bantime is set correctly
   - (Full unban test requires waiting >30s, so only config check)

6. **Jail status monitoring**
   - Uses `fail2ban-client` to query jail status
   - Parses banned IP count from output

#### Testing challenges and solutions:

**Challenge**: fail2ban has built-in delays (findtime, backends)
**Solution**: Use short bantime (30s) and maxretry=2 for quick tests

**Challenge**: fail2ban polls log file, not instant
**Solution**: Explicit `sleep(10)` after writing logs

**Challenge**: Need to check iptables inside privileged container
**Solution**: Use `docker exec` with `--privileged` flag

## Test Infrastructure

### Helper Modules

1. **`helpers.ts`** - Core utilities
   - `execAsync` - Run shell commands
   - `waitForService` - Poll until API is ready
   - `createAdminSession` - Login and get JWT
   - `apiCall` - Authenticated HTTP requests
   - `getFail2banStatus` - Parse fail2ban status output

2. **`proxy-traffic-generator.ts`** - Traffic simulation
   - `writeLogEntry` - Write single log entry
   - `writeMultipleLogEntries` - Batch writes
   - `generateExceedTraffic` - Generate enough traffic to exceed limit

3. **`user-api.ts`** - User management API
   - `UserApiClient` - Class for CRUD operations
   - `createUser`, `getUser`, `updateUser`, `deleteUser`
   - `triggerMaintenance` - Manual maintenance trigger

4. **`config-checker.ts`** - Configuration validation
   - `getFail2banConfig` - Parse jail config
   - `getFailregexPattern` - Extract regex from filter
   - `verify3proxyLogFormat` - Ensure JSON logging
   - `getProxyauthContent` - Read proxyauth file
   - `verifyJailStatus` - Check if IP banned
   - `getIptablesRules` - Read iptables chains

### Docker Integration

Tests create isolated containers:

```bash
docker build -t 3proxy-ui:e2e-test .
docker run -d --name 3proxy-ui-e2e-test ...
```

- **Privileged mode**: Required for iptables manipulation
- **Volumes**: Separate volumes for data, logs, fail2ban state
- **Ports**: 3000 (API), 3128 (HTTP proxy), 1080 (SOCKS)
- **Env vars**: Test-specific config (short bantime, etc.)

### Cleanup Strategy

Each test has a `cleanupTestEnvironment()` function that:

1. Stops and removes the container
2. Removes associated Docker volumes
3. Optionally removes the test image

Additionally, `cleanup-all.sh` provides comprehensive cleanup for manual recovery.

## Running Tests

### From project root

```bash
# Compile TypeScript
npm run compile

# Run all E2E tests (traffic + fail2ban)
npm run test:e2e

# Run specific test suite
npm run test:e2e:traffic
npm run test:e2e:fail2ban

# Run specific test file directly
npx tsx tests/e2e/traffic-limit.test.ts
```

### With Docker Compose (alternative)

```bash
cd tests/e2e
docker-compose -f docker-compose.e2e.yml up
# Tests run automatically in container logs
docker-compose -f docker-compose.e2e.yml logs -f
```

## CI/CD Integration

### GitHub Actions Example

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

      - name: Build
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DOCKER_HOST: tcp://docker:2375
```

## Test Design Principles

1. **Isolation**: Each test creates fresh container with empty database
2. **Determinism**: No reliance on external services (Telegram API is mocked)
3. **Observability**: Extensive console logging for debugging
4. **Self-cleaning**: Tests always cleanup, even on failure
5. **Realism**: Uses actual Docker image, not mocks
6. **Speed**: Tests complete in 2-5 minutes total

## Limitations and Known Issues

1. **Port conflicts**: Tests hardcode ports 3000, 3128, 1080
2. **Docker required**: Cannot run without Docker daemon
3. **Slow**: Each test rebuilds Docker image (~5 minutes)
4. **Flaky timing**: fail2ban processing delays may cause intermittent failures
5. **IPv6**: Tests only cover IPv4

## Future Improvements

- [ ] Add Jest-based unit tests for business logic
- [ ] Create test database snapshots to speed up initialization
- [ ] Add parallel test execution
- [ ] Implement retry logic for flaky Docker operations
- [ ] Add tests for concurrent traffic scenarios
- [ ] Test multiple users with different limits simultaneously
- [ ] Add performance benchmarks
