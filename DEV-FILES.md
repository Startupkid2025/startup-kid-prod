# Dev-Only vs Production Files

This document tracks which files in `dev/startupkid` are dev-only helpers
and which should be merged to `main` for production.

## Dev-Only Files (DO NOT merge to main)

These files exist only to support the dev instance and local development.
They must be excluded or removed when creating a PR to `main`.

| File/Directory | Purpose |
|---|---|
| `scripts/deploy-dev.sh` | Dev instance deploy script (strips assets, bumps dev version) |
| `base44/.app.jsonc` | Links local project to dev Base44 app (gitignored) |
| `base44/config.jsonc` | Base44 CLI config for dev deploys |
| `src/entities/*.js` | Stub CRUD entities for local dev (production auto-generates via Base44 SDK) |
| `src/functions/deleteOldCoinLogs.js` | Stub function for local dev |
| `src/integrations/Core.js` | Stub integrations for local dev |
| `startup-kid-app-dev/` | Ejected Base44 project (gitignored, deleted) |

## Production-Ready Files (MERGE to main)

These files improve performance, stability, and developer workflow.

| File | Change | Notes |
|---|---|---|
| `src/pages.config.js` | Lazy loading with `React.lazy` | Direct performance improvement |
| `src/App.jsx` | `Suspense` wrapper with loading fallback | Required for lazy loading |
| `src/lib/query-client.js` | `staleTime` + `gcTime` caching | Reduces API calls at scale |
| `vite.config.js` | Build optimization + version defines | Remove `sourcemap: true` for prod if not using Sentry |
| `src/lib/version.js` | Version/build info module | Set `BUILD_ENV=production` to hide dev badge |
| `src/Layout.jsx` | Version badge (auto-hidden in prod) | Badge only shows when `BUILD_ENV !== 'production'` |
| `.github/workflows/ci.yml` | CI pipeline | Lint, typecheck, build checks |
| `package.json` | Version field | Change from `x.x.x-dev.N` to `x.x.x` for release |

## How to Create a Production PR

1. Create a new branch from `dev/startupkid`: `git checkout -b release/0.1.0`
2. Remove all dev-only files listed above
3. Update `package.json` version: `0.1.0-dev.N` → `0.1.0`
4. Set `BUILD_ENV=production` in the CI/deploy pipeline
5. Review `CHANGELOG.md` — move items to the production release section
6. Open PR to `main`, reference the changelog
