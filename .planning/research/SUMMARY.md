# Research Summary

**Project:** SI Wafer Dashboard — Code Refactoring
**Domain:** Next.js 16.1 brownfield refactoring (~14k lines TypeScript)
**Researched:** 2026-03-29
**Confidence:** HIGH

---

## Overview

This is a brownfield refactoring of an existing, working production dashboard — not a greenfield build. All four research areas converge on the same conclusion: the codebase has a small number of high-severity structural problems that must be fixed first, followed by component decomposition work, followed by developer-experience improvements. The dependency graph is clear and consistent across all research files, making sequencing unambiguous.

The core challenge is that three god components (1254 + 799 + 718 lines) contain duplicated AI insight logic that creates a synchronization hazard — bugs fixed in one place silently remain in the other two. Decomposing them requires extracting a shared `useAiInsight` hook first, then splitting rendering. Reversing this order creates untestable, regression-prone intermediate states. The refactoring does not change any external behavior: data flow, API contracts, and feature set are preserved exactly.

The principal risk is not complexity — all the patterns are well-understood. The risk is sequencing violations: deleting mock files before removing the `postinstall` hook, splitting god components before extracting the shared hook, or testing the DB layer without an in-memory DB path. Every critical pitfall identified maps to a concrete ordering error. Following the dependency graph prevents all of them.

---

## Stack Recommendations

The baseline stack (Next.js 16.1, React 19, TypeScript 5.9, Tailwind 4.1, Recharts 3.7) is fixed — the refactoring does not change it. The following additions are recommended, each with a single specific purpose:

**New runtime dependencies:**
- **Zod v4** — input validation for AI/proxy API routes. Zero migration risk (no existing Zod); 6.5x faster than v3; eliminates manual type declarations. Addresses prompt injection risk in `/api/ai-insight`.
- **@upstash/ratelimit + @upstash/redis** — rate limiting for AI endpoints on Vercel. In-memory rate limiting does not work on serverless (each cold start resets counters); only a distributed store works correctly. Required if CC-3 is implemented this milestone; can be deferred.

**New dev dependencies:**
- **Knip** — dead code detection. Definitively confirms whether the ~2400-line mock data files (`vcm-mock.ts`, `customer-detail-mock.ts`, `supply-chain-mock.ts`) are imported anywhere before deletion.
- **@testing-library/react v16 + jsdom** — React 19-compatible DOM testing. Needed only for `useAiInsight` hook tests; DB and API route tests use Vitest directly (no React).

**No new tools needed for:**
- Error boundaries — use Next.js App Router `error.tsx` file convention
- SQLite connection fix — code change only (`let _db: Database | null = null` singleton)
- Enhanced ESLint rules — augment existing `eslint.config.mjs`
- Auth proxy — create `src/proxy.ts` (Next.js 16.1 renamed `middleware.ts` to `proxy.ts`)

**Critical version note:** Next.js 16.1 uses `proxy.ts` / `export function proxy()` — NOT `middleware.ts`. The project has no existing middleware file, so no migration is needed; create `src/proxy.ts` directly.

---

## Refactoring Patterns

Research identifies three tiers of work with clear priority ordering.

**Table stakes (must fix — correctness and safety):**
- **CC-1: SQLite singleton** — every API request currently leaks a connection; `EMFILE` risk under load. Fix is a single module-level `let _queryDb: Database | null = null` with lazy initialization. Must remove the existing `db.close()` in `queryAll()` in the same commit.
- **CC-4: Error boundaries** — any Recharts render error currently produces a white screen. Add `src/app/error.tsx`, `src/app/global-error.tsx`, and a reusable `<ChartErrorBoundary>` using `unstable_catchError` from `next/error`.
- **MP-6: Remove `postinstall` seed hook** — currently runs on every `npm install` including Vercel deploys; risks overwriting production data. Must be removed BEFORE mock data files are deleted.
- **LP-2: Remove mock data files** — ~2400 lines of dead code. Verify with Knip first, then delete. Must happen AFTER MP-6.
- **HP-2: Zod validation on AI endpoints** — `/api/ai-insight` forwards arbitrary strings to Anthropic with no size limit. Prompt injection and cost abuse vector.
- **MP-3: Fix silent catch blocks** — 10+ empty or bare `console.warn` catch blocks make production failures invisible.
- **MP-2: Move `@types/*` to devDependencies** — one-line change; reduces production bundle.

**Differentiators (meaningful quality improvement):**
- **HP-4: Extract `useAiInsight` hook** — highest-leverage single refactor. Three components have identical AI fetch logic with four `eslint-disable` suppressions hiding a stale closure bug. One hook eliminates ~300 lines of duplication and fixes the bug at the source.
- **HP-3: God component decomposition** — `ExternalComparison`, `DemandBarChart`, `MonthlyMetricsChart` become reviewable units. Three-layer split: logic hook → sub-components → thin container. Start with `DemandBarChart` (718 lines, simplest), not `ExternalComparison` (1254 lines, highest risk).
- **HP-1: Tests for DB layer and API data reconstruction** — `buildCustomerExecutive()` and VCM EAV reconstruction are the most complex untested logic. Tests act as regression safety net for god component splits.

**Anti-features (do not do this milestone):**
- React Query / SWR — explicitly out of scope
- Barrel files (`index.ts`) — zero barrel files by convention; adding them creates circular dependency risk
- Big-bang god component decomposition (all three at once) — single component per phase only
- Converting to Server Components — out of scope, high regression risk
- Adding Prettier mid-refactor — creates blame-polluting diffs that obscure logic changes

---

## Architecture Strategy

The post-refactor architecture is identical to the current architecture in data flow and external API contracts. The change is purely internal: god components become thin containers wired to extracted hooks and sub-components.

**Three-layer extraction model (apply to each god component):**
1. **Logic hook** (`useXxxState.ts`) — owns all state, derived calculations, event handlers. Returns a typed object.
2. **Sub-components** — stateless render units, props-only. Key shared candidate: `AiInsightPanel.tsx` (reusable across all three AI-using components).
3. **Thin container** — the original component file, reduced to under 200 lines, wires hook output to sub-components.

**Shared hook design for `useAiInsight`:** `buildContext` must be a callback (not a value) to avoid stale closures. The caller wraps it in `useCallback`. This eliminates the four existing `eslint-disable` suppressions without suppression. Use the `ref + always-sync effect` pattern (`buildContextRef.current = buildContext` in a bare `useEffect`) — this works on all React 19.x versions. Do not use `useEffectEvent` yet; confirm stable availability in 19.2.4 before adopting.

**SQLite singleton:** Keep `_queryDb` (read queries) and `_seedDb` (seed scripts) as separate module-level singletons. `_queryDb` must never call `ensureSchema()` — that adds unnecessary DDL overhead on every API request. Both code paths (SQLite local, Postgres Vercel) must be updated in the same commit for every query function change.

**Error boundary placement:** `src/app/error.tsx` (catches page-level errors) + `src/app/global-error.tsx` (catches root layout errors) + `ChartErrorBoundary` wrapping each chart at the call site. Tab-level boundaries in `V3Container` prevent one tab crash from collapsing the dashboard.

**Dark mode rule:** All dark mode overrides use `.dark .class-name` in `globals.css` — never `dark:` Tailwind prefix. The `@custom-variant dark (&:where(.dark, .dark *))` in globals.css uses `:where()` which has zero specificity; `.dark` overrides always win. Adding `dark:` prefixes to new or split components creates a silently broken two-mechanism system.

**`useDarkMode` call rule:** Call the hook only in top-level page components (`SupplyChainPage`, `VcmPage`, `CustomerDetailPage`) and `V3Container`. All sub-components accept `isDark: boolean` as a prop. Calling `useDarkMode()` in a sub-component causes a render flash in dark mode because `useEffect` initializes after first render.

---

## Critical Pitfalls

**CRIT-1: SQLite double-connection on hot-reload**
If the singleton is created inside a `try/catch` that silently falls back, or if two modules each create their own singleton, concurrent writes cause `SQLITE_BUSY` and query functions return `[]` silently. Empty charts, no visible error. Fix: one `let _queryDb: Database | null = null` at module level; remove all `db.close()` calls inside query functions in the same atomic commit. Verify with `lsof | grep dashboard.db` under load.

**CRIT-2: EAV category string mismatch in VCM reconstruction**
The VCM API route reconstructs domain objects by matching string literals (`'appDemand'`, `'vcmVersion'`, etc.) from DB rows. Any rename of these constants in one place but not the other silently produces empty arrays — Recharts renders blank, no error thrown. Fix: extract all category strings into `src/lib/vcm-categories.ts` before splitting the VCM route. Both seed script and API route must import from this file.

**CRIT-3: Dark mode breaks in split components**
New files added during decomposition naturally use `dark:` Tailwind prefixes, which conflict with the existing `.dark` override system. Newly split sub-components may display correct light-mode colors but remain stuck in light-mode appearance in dark mode. Fix: enforce the `.dark .class-name` globals rule before any splitting begins; add a PR review checklist item to grep for `dark:` in new component code.

**CRIT-4: Stale closure in `useAiInsight` extraction**
Carrying the existing `eslint-disable react-hooks/exhaustive-deps` suppressions into the extracted hook preserves the stale closure bug. The hook sends stale (possibly empty) data to Anthropic; Claude returns a valid-looking response describing the wrong data. No error thrown; extremely hard to detect. Fix: make `context` an explicit parameter; wrap it in `useCallback` at the call site; remove all suppressions — if ESLint still warns, fix dependencies rather than suppress.

**MOD-2: `postinstall` and mock files sequencing**
If mock data files are deleted before removing the `postinstall` hook, every subsequent `npm install` fails. If the `postinstall` hook runs on Vercel during deploy while Postgres is accessible, it risks overwriting production data. Fix: remove postinstall hook first, verify `npm install` works, then delete mock files — both in the same phase.

**MOD-5: Tests writing to real `dashboard.db`**
Vitest resolves `process.cwd()` to the project root. Without a mocked DB path, DB tests open and modify the real local database. Fix: add `VITEST=true` env var to `vitest.config.ts` and guard `getSqliteDb()`: `const dbPath = process.env.VITEST ? ':memory:' : DB_PATH`. Must be established before writing the first DB test.

---

## Phase Sequencing Implications

All four research files converge on the same dependency graph. The sequencing below is unambiguous.

### Phase 1: Foundation Fixes
**Rationale:** Three issues (SQLite leak, error boundaries, postinstall hook) can cause crashes or data loss in the current codebase. They must be resolved before any structural refactoring begins. The SQLite fix is atomic and cannot be split across phases (CRIT-1). The postinstall fix must precede mock data deletion (MOD-2).
**Delivers:** A codebase that no longer leaks DB connections, no longer crashes to white screen on chart errors, and no longer auto-seeds on `npm install`.
**Work items:** CC-1 (SQLite singleton), CC-4 (error boundaries), MP-6 (remove postinstall hook), LP-2 (delete mock files with Knip verification), MP-2 (devDependencies), MP-3 (fix silent catch blocks).
**Avoids:** CRIT-1, MOD-2, MIN-3.
**Research flag:** Standard patterns — skip research-phase.

### Phase 2: Core Quality
**Rationale:** `useAiInsight` extraction (HP-4) is the single highest-leverage refactor and is a prerequisite for god component splits (HP-3). Zod validation (HP-2) is independent but logically paired with API route improvements. This phase produces the safety infrastructure for Phase 3.
**Delivers:** Shared `useAiInsight` hook eliminating ~300 lines of duplication and fixing the stale closure bug; Zod validation on AI endpoints eliminating prompt injection risk; ESLint rule upgrades surfacing complexity violations.
**Work items:** HP-4 (useAiInsight hook + AiInsightPanel component), HP-2 (Zod validation), ESLint complexity rule additions.
**Avoids:** CRIT-4, HP-2 prompt injection.
**Research flag:** Standard patterns — skip research-phase. Hook signature design is fully specified in ARCHITECTURE.md.

### Phase 3: God Component Decomposition
**Rationale:** Depends on Phase 2 (shared hook must be stable before splitting renders). Process one component at a time to keep diffs reviewable. Order by ascending complexity: `DemandBarChart` (718 lines) first, then `MonthlyMetricsChart` (799 lines), then `ExternalComparison` (1254 lines). `VcmPage` and `IndicatorChart` are lower risk and can be handled alongside.
**Delivers:** All five god components reduced to thin containers under 200 lines, each with an extracted state hook and sub-components.
**Work items:** HP-3 (god component splits, one per PR), dark mode prop-passing rule enforced throughout (CRIT-3).
**Avoids:** CRIT-3, MOD-1, MOD-4, MIN-2, MIN-4.
**Research flag:** Standard patterns with one watch item: dark mode specificity (CRIT-3) requires active enforcement during every PR in this phase.

### Phase 4: Tests and Developer UX
**Rationale:** Tests are most valuable written alongside or immediately after decomposition — the extracted functions are their own test surface. DB tests require the `:memory:` path guard to be established first (MOD-5). CLI seed UX improvements depend on Phase 1 having removed the postinstall hook.
**Delivers:** Test coverage for DB layer, VCM reconstruction, `buildCustomerExecutive()`, and `useAiInsight` hook; documented `npm run seed` CLI with `--env` and `--clear` flags; `SEEDING.md` in `scripts/`.
**Work items:** HP-1 (tests — DB layer, API reconstruction, useAiInsight), CLI seed UX (explicit `npm run seed`, documentation).
**Avoids:** MOD-5 (`:memory:` DB in tests), CRIT-2 (VCM category constants test coverage).
**Research flag:** Standard patterns — skip research-phase. Test targets are specifically enumerated in FEATURES.md.

### Deferred (post-milestone)
- **CC-2 (auth)** and **CC-3 (rate limiting)**: valid improvements but require infrastructure decisions (Upstash KV, `DASHBOARD_SECRET` token strategy). Requires adding Upstash as a second external dependency for an internal tool. Defer unless the dashboard becomes public-facing.
- **MP-1 (file cache to DB/KV)**: depends on CC-3 infrastructure choice. The transcript endpoint's DB-cache pattern is the right model when ready.
- **HP-5 (pagination)**: requires test coverage first and changes API contracts. Phase 4 test work is the prerequisite.
- **LP-3 (MD5 to SHA-256)**: one-line change; pair with a cache clear. Trivial but cache invalidation side effect (MOD-3) means it should not happen mid-refactoring.

### Phase Ordering Rationale

The ordering is driven by three constraints that all four research files agree on:
1. CC-1 (SQLite singleton) is a prerequisite for MP-1 (cache improvements) and must be atomic.
2. HP-4 (`useAiInsight` hook) is a prerequisite for HP-3 (god component splits) — splitting before extraction creates untestable intermediate states.
3. MP-6 (postinstall removal) is a prerequisite for LP-2 (mock file deletion) — deletion before hook removal breaks `npm install`.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Baseline stack is fixed constraints. New additions (Zod v4, Knip, @testing-library/react v16) all verified against npm and official docs. |
| Features / Work Items | HIGH | All items sourced from direct codebase audit (CONCERNS.md + source file reads). No speculation. |
| Architecture | HIGH | Official Next.js 16.1 docs verified. Patterns (singleton, three-layer split, error boundary placement) are established and source-confirmed. |
| Pitfalls | HIGH | All critical pitfalls sourced from direct source file reads (db.ts line numbers cited, DemandBarChart lines cited, etc.). Not inferred. |

**Overall confidence: HIGH**

### Gaps to Address

- **`useEffectEvent` availability in React 19.2.4**: ARCHITECTURE.md recommends the `ref + always-sync effect` pattern as the safe fallback and notes that `useEffectEvent` may be stable in 19.2 — confirm before adopting it in the hook. Defaulting to the ref pattern is safe regardless.
- **Upstash KV infrastructure decision**: CC-2 (auth) and CC-3 (rate limiting) are deferred pending a decision on whether to add Upstash as a dependency for an internal tool. STACK.md recommends Upstash; ARCHITECTURE.md recommends in-memory rate limiting per-route as sufficient for this scale. The roadmapper should flag this as a user decision before scheduling those phases.
- **Test environment setup**: MOD-5 documents that the `:memory:` DB path guard must be established before any DB tests are written. This is a one-time vitest.config.ts change that should be the first commit in Phase 4.
- **Knip false-positive rate for mock data**: LP-2 requires confirming mock files have zero imports. Knip's Next.js plugin should handle this correctly, but a manual grep verification is recommended before deletion given that these files are ~2400 lines.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.1 Error Handling official docs — `error.tsx`, `global-error.tsx`, `unstable_catchError`
- Next.js 16.1 Proxy (formerly Middleware) official docs — `proxy.ts` convention confirmed
- Zod v4 official docs (zod.dev/v4) — version, bundle size, API
- better-sqlite3 npm — singleton pattern, WAL mode behavior
- @upstash/ratelimit npm v2.0.8 — serverless rate limiting
- Knip v6.0.6 (knip.dev) — Next.js plugin, dead code detection
- Direct codebase reads: `src/lib/db.ts`, `src/components/supply-chain/IndicatorChart.tsx`, `src/components/customer-detail/ExternalComparison.tsx`, `src/components/vcm/DemandBarChart.tsx`, `src/app/api/ai-insight/route.ts`, `src/app/layout.tsx`, `package.json`

### Secondary (MEDIUM confidence)
- React stale closure patterns (tkdodo.eu) — `buildContextRef` pattern
- React component decomposition (Martin Fowler) — three-layer split model
- Vitest React 19 snapshot issue #6908 — avoid snapshot tests for React components; use assertion-based tests

---

*Research completed: 2026-03-29*
*Ready for roadmap: yes*
