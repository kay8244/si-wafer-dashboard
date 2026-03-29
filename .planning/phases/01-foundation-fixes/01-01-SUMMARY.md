---
phase: 01-foundation-fixes
plan: 01
subsystem: data
tags: [sqlite, connection-pool, package-json, devDependencies]

# Dependency graph
requires: []
provides:
  - "SQLite globalThis singleton connection (survives HMR)"
  - "Clean package.json with no postinstall and correct dependency classification"

key-files:
  modified:
    - src/lib/db.ts
    - package.json
    - package-lock.json
  created: []
---

## What was done

### Task 1: SQLite globalThis singleton
- Replaced per-request `Database()` instantiation with `globalForDb._sqliteDb` singleton cached on `globalThis`
- Singleton survives Next.js HMR in dev mode
- WAL journal mode set on first connection
- Removed `db.close()` calls in `queryAll()` to prevent closing shared connection
- All existing exports preserved with identical signatures

### Task 2: Package.json cleanup
- Removed `postinstall` hook (`npx tsx scripts/seed.ts`) — seeding is now manual via `npm run seed`
- Moved 5 dev-only packages to `devDependencies`: `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`
- Kept `typescript` in `dependencies` (Vercel needs it at build time)
- Regenerated `package-lock.json`

## Deviations

None.

## Self-Check: PASSED
- [x] `globalForDb._sqliteDb` singleton pattern in db.ts
- [x] No `db.close()` in query functions
- [x] No `postinstall` script in package.json
- [x] Dev-only packages in devDependencies
- [x] `typescript` remains in dependencies
- [x] `npm run build` passes with zero errors
