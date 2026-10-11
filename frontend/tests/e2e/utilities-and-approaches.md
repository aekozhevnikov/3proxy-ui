# E2E Testing Strategy for 3proxy-ui

This document explains the testing approaches used in the E2E test suite.

## Test Types

### 1. Traffic Limit Tests (`traffic-limit/`)

Tests the complete flow of traffic monitoring and user deactivation.

#### What's tested:

1. **Real traffic through 3proxy** (`real-proxy-traffic-test.ts`)
   - Creates a user, restarts 3proxy so it picks up `.proxyauth`
   - Runs a local HTTP target inside the container and sends `curl` requests through the proxy
   - Verifies 3proxy itself wrote the log entry with the expected byte counts
   - Verifies `dataUsed` reflects the logged traffic after maintenance

2. **User creation with data limits** (`traffic-limit-enforcement.test.ts`)
   - Creates user via API with 100 MB limit
   - Verifies user is active

3. **Traffic accumulation**
   - Writes JSON logs in the real 3proxy `logformat`
   - Generates 110 MB to exceed the 100 MB limit

4. **Maintenance execution**
   - Triggers `/api/users/maintenance` endpoint
   - Verifies maintenance succeeds

5. **Deactivation verification**
   - Checks user.isActive === false in database
   - Verifies deactivatedAt timestamp is set
   - Confirms dataUsed exceeds limit

6. **.proxyauth file update**
   - Verifies deactivated user is commented out
   - Ensures no active entry for the same user is left behind

7. **Expiration-based deactivation** (`expiration-deactivation.test.ts`)
   - `createProxyUser` rejects an active user with a past `expiresAt`, so the test creates a
     user with a short future date and waits for it to pass
   - Runs maintenance and verifies deactivation

8. **Manual maintenance trigger** (`manual-maintenance-test.ts`)
   - Checks the response contract of the endpoint

9. **Scheduler verification** (`scheduler-test.ts`)
   - Appends a log entry and waits for `dataUsed` to grow without any manual trigger

#### Why both real proxy traffic and synthetic log entries:

- **Real requests** cover the full path: 3proxy -> log -> parser -> database. This is what
  proves the recorded traffic is correct, so it is the primary check.
- **Written log entries** are used where the scenario needs a precise byte count (exceeding a
  100 MB limit would mean transferring that much data). The entries use the exact `logformat`
  from `3proxy.cfg`, and the same helper builds both kinds.
- **The local target** runs inside the container, so the test needs no internet access.

### 2. Fail2ban Blocking Tests (`fail2ban-blocking/`)

Tests the fail2ban integration for IP blocking.

#### What's tested:

1. **Regex pattern testing** (`regex-validation.test.ts`)
   - Ensures filter regex matches 407/403 errors
   - Confirms <HOST> placeholder captures IP
   - Verifies ignoreregex excludes 00000 and 200 codes

2. **Configuration validation** (`jail-configuration.test.ts`)
   - Verifies jail configuration in `/etc/fail2ban/jail.d/3proxy-docker.local`
   - Checks ports (3128, 1080)
   - Confirms bantime, findtime, maxretry match the environment values
   - Validates log path

3. **Auth failure banning** (`auth-failure-banning.test.ts`)
   - Writes auth failure entries until `maxretry` is exceeded
   - Polls `fail2ban-client status` until the IP appears (up to 30s)
   - Checks the iptables rule is created

4. **Legitimate traffic ignored** (`legitimate-traffic-ignored.test.ts`)
   - Writes more successful entries than `maxretry`
   - Confirms IP is NOT banned

#### Testing challenges and solutions:

**Challenge**: fail2ban has built-in delays (findtime, backends)
**Solution**: Use short bantime (30s) and maxretry=2 for quick tests

**Challenge**: fail2ban polls the log file, it is not instant
**Solution**: Poll `fail2ban-client status` instead of a fixed sleep

**Challenge**: Need to check iptables inside privileged container
**Solution**: Use `docker exec` with `--privileged` flag

## Test Infrastructure

### Helper Modules

1. **`environment.ts`** - Compose lifecycle
   - Paths derived from the module location (no absolute repository path)
   - `upService` / `downService` / `teardown` - compose up and down with volumes
   - `resetRuntimeState` - truncates the runtime logs and `.proxyauth`

2. **`helpers.ts`** - Core utilities
   - `execAsync` - Run shell commands (with a raised `maxBuffer` for build output)
   - `waitForService` - Poll until API is ready
   - `createAdminSession` - Login and get JWT
   - `apiCall` - Authenticated HTTP requests
   - `execInContainer` - Run a command inside the container
   - `getFail2banStatus` - Parse fail2ban status output

3. **`three-proxy-log.ts`** - Log entries in the real 3proxy `logformat`
   - `buildLogEntry` - Build an entry with all fields 3proxy emits
   - `appendLogEntry` - Append an entry to the container's log
   - `readRuntimeLog` - Read the current log

4. **`proxy-traffic-generator.ts`** - Real traffic through the proxy
   - `startLocalTarget` - Local HTTP server inside the container (no internet needed)
   - `generateHttpTraffic` - `curl -x` requests with proxy authentication

5. **`user-api.ts`** - User management API
   - `UserApiClient` - Class for CRUD operations
   - `createUser`, `getUser`, `updateUser`, `deleteUser`
   - `triggerMaintenance` - Manual maintenance trigger

### Docker Integration

Tests run the stack described in `docker-compose.e2e.yml`, which mirrors
`docker-compose.dev.yml`:

```bash
docker compose -p 3proxy-e2e-test -f tests/e2e/docker-compose.e2e.yml up -d --build 3proxy-ui-e2e
```

- **Build context**: `../..` relative to the compose file, so no absolute path is baked in
- **Privileged mode**: only the fail2ban service, required for iptables manipulation
- **Volumes**: separate volumes for the database and the fail2ban jail
- **Ports**: 3000 (API), 3128 (HTTP proxy), 1080 (SOCKS) - the two UI services are never
  started at the same time

### Cleanup Strategy

Each suite's `cleanup()` function:

1. Stops and removes the service
2. Removes the compose project volumes
3. Truncates the runtime logs and `.proxyauth`

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

# Run specific suite runner directly
npx tsx tests/e2e/traffic-limit/run-all.test.ts
npx tsx tests/e2e/fail2ban-blocking/run-all.test.ts
```

### Bringing the stack up manually

```bash
docker compose -p 3proxy-e2e-test -f tests/e2e/docker-compose.e2e.yml up -d --build 3proxy-ui-e2e
docker compose -p 3proxy-e2e-test -f tests/e2e/docker-compose.e2e.yml logs -f 3proxy-ui-e2e
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

1. **Isolation**: Each suite starts from a compose project with fresh volumes
2. **Determinism**: No reliance on external services - the traffic target is local to the container
3. **Observability**: Each test prints `PASS`/`FAIL` with its duration
4. **Self-cleaning**: Suites always clean up, even on failure
5. **Realism**: Uses the actual Docker image, the real 3proxy and the real entrypoint
6. **Honest assertions**: A test that cannot fail is worse than no test - each one throws with
   the observed values in the message

## Limitations and Known Issues

1. **Port conflicts**: Tests hardcode ports 3000, 3128, 1080
2. **Docker required**: Cannot run without Docker daemon
3. **Slow**: Each suite rebuilds the Docker image
4. **Flaky timing**: fail2ban processing delays may cause intermittent failures
5. **Re-accumulation**: the maintenance route re-reads the newest log on every run, so
   `dataUsed` keeps growing while a test waits - assertions are monotonic, not exact
6. **IPv6**: Tests only cover IPv4

## Future Improvements

- [ ] Implement a byte-offset cursor so maintenance does not re-count the same log entries
- [ ] Create test database snapshots to speed up initialization
- [ ] Implement retry logic for flaky Docker operations
- [ ] Add tests for concurrent traffic scenarios
- [ ] Test multiple users with different limits simultaneously
- [ ] Add performance benchmarks
