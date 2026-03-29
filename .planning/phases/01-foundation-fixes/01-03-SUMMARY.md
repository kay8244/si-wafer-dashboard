---
phase: 01-foundation-fixes
plan: 03
subsystem: data
tags: [mock-data, test-fixtures, bundle-size, imports]

# Dependency graph
requires:
  - "01-01 (stable DB connection for seed verification)"
provides:
  - "Mock data isolated in tests/fixtures/ (not in production bundle)"
  - "Clean src/data/ directory without mock files"

key-files:
  modified:
    - scripts/seed.ts
    - scripts/seed-postgres.ts
    - scripts/export-mock-data.ts
  created:
    - tests/fixtures/supply-chain-mock.ts
    - tests/fixtures/customer-detail-mock.ts
    - tests/fixtures/vcm-mock.ts
---

## What was done

### Task 1: Move mock data and update imports
- Moved 3 mock data files (~2400 lines) from `src/data/` to `tests/fixtures/` using `git mv` (preserves history)
- Updated import paths in `scripts/seed.ts`: `../src/data/*-mock` -> `../tests/fixtures/*-mock`
- Updated import paths in `scripts/seed-postgres.ts`: same pattern
- Updated import paths in `scripts/export-mock-data.ts`: `@/data/*-mock` -> `../tests/fixtures/*-mock`
- Verified no remaining references to `src/data/*-mock` anywhere in the codebase

## Deviations

None.

## Self-Check: PASSED
- [x] Mock files no longer exist in `src/data/`
- [x] Mock files exist in `tests/fixtures/`
- [x] No references to `src/data/*-mock` remain in scripts
- [x] No references to `src/data/*-mock` remain in src
- [x] `npm run build` passes
- [x] `npm run seed` passes (18141 rows seeded)
