# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://github.com/aekozhevnikov/3proxy-ui/compare/v0.2.4...HEAD
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