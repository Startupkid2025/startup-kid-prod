# Changelog

All notable changes to Startup Kid App are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

When merging `dev/startupkid` → `main`, review each version below and confirm
all changes are production-ready. See `DEV-FILES.md` for files that must NOT
be merged to main.

---

## [0.1.0-dev.3] - 2026-03-10

### Added
- **Sentry error monitoring**: Crash reporting with error boundary and Hebrew fallback UI (`src/lib/sentry.js`, `src/App.jsx`, `src/main.jsx`)
- **Vitest test suite**: 12 smoke tests covering version tracking, pages config, and React Query settings (`src/test/`)
- **CI test step**: Tests now run in GitHub Actions before build (`.github/workflows/ci.yml`)

### Infrastructure
- **Branch protection**: Needs repo owner to enable on `main` (see instructions below)

### Branch Protection Setup (for repo owner)
Go to `github.com/Startupkid2025/startup-kid-app/settings/branches`:
1. Add rule for branch `main`
2. Enable "Require a pull request before merging"
3. Enable "Require approvals" (1 reviewer)
4. Enable "Require status checks to pass" → add "quality" check
5. Enable "Do not allow bypassing the above settings"

---

## [0.1.0-dev.2] - 2026-03-10

### Added
- **Lazy loading**: Route-based code splitting with `React.lazy` + `Suspense` for all 9 pages (`src/pages.config.js`, `src/App.jsx`)
- **CI pipeline**: GitHub Actions workflow for lint, typecheck, build, and bundle size check (`.github/workflows/ci.yml`)
- **Version tracking**: Build-time version injection with dev badge in UI (`src/lib/version.js`, `vite.config.js`, `src/Layout.jsx`)
- **Dev deploy script**: Automated deploy to dev instance with asset stripping and version bumping (`scripts/deploy-dev.sh`)
- **Entity/function/integration stubs**: Local dev stubs so app compiles without Base44 backend (`src/entities/`, `src/functions/`, `src/integrations/`)

### Changed
- **React Query caching**: Added `staleTime` (2min) and `gcTime` (5min) to reduce redundant API calls (`src/lib/query-client.js`)
- **Vite build config**: Added `es2020` target, sourcemaps, chunk size warnings, build-time version defines (`vite.config.js`)
- **Package version**: `0.0.0` → `0.1.0-dev.2`

### Infrastructure
- Base44 dev instance deployed at `startup-kid-app-copy-d0e832ae.base44.app`
- `.gitignore` updated to exclude `.env`, `base44/.app.jsonc`, `startup-kid-app-dev/`

---

## [Unreleased - Production]

_When preparing a release to main, move relevant items from dev versions above
into this section, remove dev-only changes, and assign a production version
(e.g., 0.1.0)._

### To include in production
- [ ] Lazy loading (pages.config.js, App.jsx)
- [ ] React Query caching (query-client.js)
- [ ] Vite build optimization (vite.config.js) — but change sourcemap/version defines for prod
- [ ] CI pipeline (ci.yml)
- [ ] Version tracking (version.js, Layout.jsx) — set BUILD_ENV=production to hide badge
- [ ] Sentry error monitoring (sentry.js, main.jsx, App.jsx) — add VITE_SENTRY_DSN to prod env
- [ ] Error boundary with Hebrew fallback UI (App.jsx)
- [ ] Vitest tests and test config (src/test/, vite.config.js test section)

### To exclude from production
- [ ] Dev deploy script (scripts/deploy-dev.sh)
- [ ] Base44 dev config (base44/.app.jsonc, base44/config.jsonc)
- [ ] Entity/function/integration stubs (src/entities/, src/functions/, src/integrations/) — production uses Base44 SDK auto-generation
