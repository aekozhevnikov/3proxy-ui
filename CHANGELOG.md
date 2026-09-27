# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-09-27

### Security
- Eight routes ran with no authorisation: two returned every proxy user's plaintext password to any
  caller, four could change state, and one accepted a caller-supplied log directory that fed crafted
  log lines into the limit enforcer, which writes to the database and deactivates users. All of them
  now require an admin session, and the role is read from the database on every call, so a de-admined
  or deleted account stops working immediately
- The server actions were reachable straight from the browser, with the middleware as the only gate.
  `createProxyUser`, `updateProxyUser`, `deleteProxyUser` and `update3proxyConfig` now assert a
  session themselves, and the edit page no longer relies on the middleware alone
- The user detail route returned the password, which reached the browser in the RSC payload of the
  edit page every time the modal opened. The share endpoint stays the one path that serves a
  plaintext, because the config it builds needs one
- Logins are throttled per username and source address with an exponential backoff, and every outcome
  is logged. The endpoint previously had no counter, no delay and no log line
- A password change now ends the sessions issued before it, and the session cookie's `secure` flag
  comes from one definition instead of three that had drifted apart
- Next.js upgraded to 16.3.6, closing four open middleware/proxy bypass advisories. One of them,
  GHSA-6gpp, matched this project exactly: Turbopack has been the default bundler since 16.0
- A username is validated before it is written. It becomes a token in the file 3proxy parses, where
  whitespace and a colon are argument separators, so an unvalidated value could add entries to
  3proxy that the database has no record of and the panel cannot revoke
- Security headers added: a CSP with `frame-ancestors 'none'`, plus `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`
- Wildcard `Access-Control-Allow-Origin` removed from the logs, system status and traffic routes. The
  log endpoint returns every proxy customer's identity, source address and destination
- The log endpoint no longer reads whole log files into memory, and its `limit` is clamped
- Error responses return a neutral message and log the original server-side, so Prisma text carrying
  schema and paths no longer reaches the browser
- `setup.ts` hardcoded `admin`/`admin` while the rest of the code read `ADMIN_USERNAME` and
  `ADMIN_PASSWORD`, so the first account always had a well-known password. Both compose stacks now
  require `ADMIN_PASSWORD`
- `.dockerignore` used `prisma/*.db`, which does not match `prisma/sqlite/app.db`, so a local
  database of plaintext proxy passwords was entering the build context and the build-stage layers
- `getAllProxyUsers`, a server action with no callers and no authorisation, returned every proxy
  user's plaintext password. Removed, with a test that fails if it is reintroduced
- The user list, detail, share and profile routes checked only that a session existed, not the role.
  They now use the same admin check as the rest, which matters for the share route in particular
- The login throttle keyed on `x-forwarded-for`, which the caller sets freely, so rotating the header
  gave unlimited attempts at the configured rate. It now keys on the username and sweeps expired
  entries
- The password-change endpoint minted a new token without comparing the token's session version to
  the database, so a revoked token plus a known password could resurrect a session. The increment now
  comes from the stored row
- The session cookie's `Secure` flag now comes from `SESSION_COOKIE_SECURE` instead of `NODE_ENV`.
  The standalone server sets `NODE_ENV=production` unconditionally, so the shipped compose stack was
  marking the cookie Secure while serving plain HTTP, and a browser refused to store it

### Fixed
- **Deactivated users could still use the proxy.** They were written as a
  `# DEACTIVATED <date>: user:CR:"…"` line, but `#` is not a comment in a file 3proxy pulls in with
  its `$` directive: the included content is parsed by a recursive parser with no `#` handling, so
  the user stayed registered and authenticated normally. Deactivated users now leave the file
  entirely, and 3proxy is restarted when the served set changes, so a deactivation takes effect on the
  run that caused it rather than on the next unrelated restart
- The maintenance scheduler could not reach its own endpoint over loopback, so traffic accounting and
  expiry enforcement never ran inside a container. The job now runs in-process
- The scheduler's success was never logged, which is how a job failing on every start went unnoticed
- Proxy passwords are hashed for `.proxyauth` with MD5-crypt (`$1$`) and a per-user random salt. The
  previous setup used the traditional DES variant with a hardcoded `"qwer"` salt, which ignored
  everything after the 8th character of the password — `generatePassword()` produces 32 characters,
  so three quarters of every generated password never reached the hash
- `GET /api/admin/users` no longer returns the `password` column, so rendering the users table does
  not hand every proxy credential to the browser
- The traffic sync offsets were written into an image layer instead of the data volume, so a rebuilt
  container restarted from zero and re-counted the whole log history
- `NODE_TLS_REJECT_UNAUTHORIZED=0` removed from the environment template
- Corrected a comment in the proxy test route that claimed the stored password was already hashed
- A failed 3proxy restart no longer strands a deactivation: the reload decision compared against
  what was on disk, so a single transient failure looked like "already applied" and the change was
  never retried
- Jest ignored `/dist/` for test discovery but not for module resolution, so running
  `npm run compile` before the suite — which the Docker build and CI both do — put compiled copies
  of the manual mocks into the haste map

## [0.5.1] - 2026-09-26

### Changed
- `linux/amd64` and `linux/arm64` are now built on runners of their own architecture and merged
  into a single multi-arch manifest, instead of emulating arm64 with QEMU

### Fixed
- The arm64 build no longer hangs forever in `npm install`: the emulated process was dying with
  `SIGILL` and buildx kept waiting on the dead step, so the publish job burned the 6-hour default
  timeout and no release shipped an arm64 image
- Release jobs carry `timeout-minutes`, so a stuck build fails in minutes instead of hours
- Docker layers are cached between releases, so a release no longer rebuilds the Next.js bundle
  from scratch
- `npm install --no-cache` is replaced with `npm ci`, which replays the lockfile instead of
  re-resolving the dependency tree
- Build tools (`python3`, `make`, `g++`, `sqlite-dev`) are installed before the dependency
  install, so a package without a prebuild for the target platform can still fall back to
  `node-gyp`

## [0.5.0] - 2026-09-26

### Added
- End-to-end test stack based on `docker-compose.dev.yml` (relative build context, shared
  helpers, honest per-test runner with a real exit code)
- E2E test that drives real traffic through 3proxy and asserts the resulting `dataUsed`,
  plus realistic 3proxy log fixtures in the real `logformat` for unit and integration tests
- Unit and integration coverage for traffic parsing, BigInt precision of `dataUsed`, and
  byte-offset log reading (including partial lines, truncation and log rotation)
- Pre-release workflow now runs the E2E suite on top of the jest projects

### Changed
- Maintenance reads log traffic from a stored byte offset per file (keyed by inode) instead of
  re-reading the newest log from the start on every run, so entries are no longer counted
  repeatedly; the log file is no longer picked by mtime, which raced with 3proxy writing to it
- E2E fail2ban service requests only `NET_ADMIN`/`NET_RAW` instead of `privileged`, and no
  longer mounts the Docker socket — neither was needed
- `test:fail2ban` now runs the jest fail2ban project (it pointed at a non-existent compiled
  file), and `test:all` no longer repeats suites that `test:unit` already runs

### Fixed
- `3proxy/3proxy.cfg` and `3proxy/fail2ban/3proxy-docker.conf` are tracked again: the blanket
  `3proxy` ignore also dropped them from every fresh checkout, so the Docker build failed on CI
  with `3proxy-docker.conf: not found` and the fail2ban filter never reached the image
- E2E log reset no longer fails on CI with `EACCES`: the log files are created by 3proxy inside the
  container and belong to root there, while the checkout belongs to the runner user, so they are
  now truncated from inside the container with a host-side fallback
- `format:check` no longer fails on patterns that match no files (`src/**/*.json`,
  `scripts/**/*.tsx`); the globs are quoted so the shell does not expand them first
- Integration tests no longer time out in `beforeAll` while `prisma migrate deploy` runs, which
  silently cut the migration short
- `host.docker.internal` is mapped to the host gateway in the E2E stack, so the scheduler can
  reach the app on Linux runners
- Docker image build and compose output are streamed line by line instead of appearing in one
  burst at the end of the run
- Honour `PROXY_CONTAINER_NAME` when locating the 3proxy container — the name was hardcoded to
  `3proxy`/`vpn-3proxy`, so any renamed deployment silently lost config reloads (`.proxyauth`
  was never re-read and 3proxy answered 407 to every request)
- `readTrafficLogs` now includes rotated `3proxy.log.YYYY.MM.DD` files, matching the predicate
  already used by the log parser, log finder and maintenance route
- Preserve BigInt precision of `dataUsed`: it was round-tripped through `Number()` before being
  added to, losing exactness above 2^53
- Sync state is persisted even when a maintenance run fails, so one bad log file no longer
  freezes traffic accounting
- Give `docker restart` enough time to finish instead of failing at the 5s default timeout
- Fix fail2ban filter `3proxy-docker` not found — filter config now included in Docker image
- Remove `[Definition]` section from jail.local (belongs in filter.d only)
- Reduce Docker image size by ~50% via multi-stage build with production-only node_modules
- Use standalone Next.js build instead of full node_modules in runtime image
- Generate Prisma query engine in runtime stage for correct target platform
- Separate database initialization (migrate + setup) from application startup

## [0.4.0] - 2026-09-21
### Added
- Multi-platform Docker builds (amd64 + arm64)
### Fixed
- Release workflow uses `github.ref_name` for tag detection
- Docker tags now include both platforms for Apple Silicon support

## [0.2.9] - 2026-09-21

### Fixed

- ShareModal UI improvements
- Update next-env.d.ts

## [0.2.8] - 2026-09-21

### Added

- Copy All Configs button in ShareModal
- Copy Proxy Data button in ShareModal
- Tests for new ShareModal features

## [0.2.7] - 2026-09-21

### Changed

- Workflow trigger improvements

## [0.2.6] - 2026-09-21

### Changed

- Workflow trigger improvements

## [0.2.5] - 2026-09-21

### Changed

- Update workflow triggers for release pipeline

## [0.2.4] - 2026-09-21

### Changed

- Update CHANGELOG.md

## [0.2.3] - 2026-09-20

### Fixed

- Use `github.event.workflow_run.ref_name` for tag detection in release.yml
- Use git fallback to get tag name when workflow context is empty
- Ensure Docker and GitHub Release use proper tag-version

## [0.2.2] - 2026-09-20

### Added

- Update CHANGELOG.md with all version history

## [0.2.1] - 2026-09-20

### Fixed

- Simplify release.yml to use `github.ref_name` for tag detection in workflow_run context
- Fix duplicate changelog entries in release process

## [0.2.0] - 2026-09-20

### Changed

- Major version bump after workflow fixes
- Release workflow now uses `github.ref_name` for tag resolution

## [0.1.9] - 2026-09-20

### Fixed

- Robust tag detection in release.yml with git fallback
- Fix VERSION being empty for Docker build

## [0.1.8] - 2026-09-20

### Fixed

- Use `github.event.workflow_run.tag_name` in release.yml
- Fix tag variable not being passed to `gh release create`

## [0.1.7] - 2026-09-20

### Fixed

- Resolve TS2345 type errors in system/status tests
- Fix duplicate code warnings in user-form tests (create-mode, edit-mode, form-behavior)
- Fix share-modal tests by adding Heroicons mocks (CheckIcon, ClipboardIcon)
- Fix login.test.tsx double `global.fetch` override
- Fix profile-form.test.tsx double `global.fetch` override
- Reduce boilerplate in test files with helper functions

### Added

- Create `log-helper.ts` for fail2ban-blocking E2E tests
- Create `component-mocks.tsx` for users-list tests
- Add `.prettierignore` for fonts and globals.css
- Add CSS variables to `:root` in globals.css to resolve IDE warnings

## [0.1.6] - 2026-09-20

### Fixed

- Remove unused import UserForm from users-list.tsx
- Remove unused variable execAsync from core/actions/config.ts
- Fix throw-of-locally-caught-exception warnings in profile-form, user-form, useUsers hooks

### Changed

- Use shared ShareModal component from src/components instead of local duplicate

## [0.1.5] - 2026-09-20

### Added

- Task Master AI integration with custom slash commands
- .claude directory with commands and settings
- .taskmaster directory with PRD docs and config
- Comprehensive unit test suite (79 new test files)
- Component-level mocks for @heroui/react

### Changed

- Refactor user management components into modular files
- Move password input components to src/components
- Refactor dashboard into modular card components
- Add custom hooks (useUsers, useUserModals, useUsersActions)

## [0.1.4] - 2026-09-20

### Added

- Responsive dashboard components
- Custom hooks for user management
- Modular user form components
- Password input with toggle visibility

### Fixed

- Mobile layout fixes for proxy user cards
- Table dark mode styles

## [0.1.3] - 2026-09-19

### Fixed

- Add concurrency groups to cancel redundant workflow runs
- Gate release on pre-release test success

## [0.1.2] - 2026-09-19

### Changed

- Update screenshots for MacBook/iPad/iPhone
- Fix table dark mode

## [0.1.1] - 2026-09-19

### Changed

- Update screenshots and fix table styles for desktop/tablet

## [0.1.0] - Initial version

[Unreleased]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.5.0...v0.5.1
[0.2.9]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.9...v0.2.0
[0.1.9]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.1.0...v0.1.1
