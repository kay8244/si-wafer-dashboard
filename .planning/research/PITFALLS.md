# Domain Pitfalls

**Domain:** Next.js dashboard refactoring — dual-database, Recharts, AI integrations
**Researched:** 2026-03-29
**Sources:** Codebase audit (CONCERNS.md, ARCHITECTURE.md, direct file reads of db.ts, cache.ts, DemandBarChart.tsx, IndicatorChart.tsx, ExternalComparison.tsx, VcmPage.tsx, route.ts files, useDarkMode.ts, globals.css, seed.ts)

---

## Critical Pitfalls

Mistakes that cause silent data corruption, crashes, or irreversible production breakage.

---

### CRIT-1: Introducing a New SQLite Connection Per Call While "Fixing" the Leak

**What goes wrong:** The fix for CC-1 is to replace `getSqliteDb()` (creates a new connection every call) with a module-level singleton. If done incorrectly — for example creating a singleton inside a `try/catch` that silently falls back to a new connection on error, or creating separate singletons in two different modules — you end up with two open connections writing to the same WAL file simultaneously. SQLite allows only one writer at a time; a second concurrent write raises `SQLITE_BUSY` and the query functions return `[]` silently (see db.ts lines 132-136, 154-157, 178-181, 207-210). The dashboard shows empty charts with no visible error.

**Why it happens:** `better-sqlite3` is synchronous. Next.js serverless routes are async. Developers assume "singleton per module" is safe, but Next.js hot-reload in dev recreates modules, and the singleton reference becomes stale without clearing the old connection first.

**Consequences:** Empty charts in development after the first hot-reload. The bug disappears on cold restart, making it intermittent and hard to trace. On production (Vercel Postgres path), this pitfall does not apply — but if the environment check `isPostgres()` is broken, you get double-open against the SQLite file on prod.

**Prevention:**
- Create exactly one singleton with a clear module-level `let _db: Database | null = null` pattern.
- Add a `process.on('exit', () => _db?.close())` guard.
- Never call `db.close()` inside individual query functions — remove the existing `db.close()` calls in `queryAll()` (lines 130, 134) as part of the same change.
- Verify: after the fix, run `lsof | grep dashboard.db` under load and confirm only one fd is open.

**Detection warning signs:** Charts render empty immediately after a file save in dev. `console.warn '[db] queryAll failed'` appears after hot-reload but not after server restart.

**Phase:** DB layer refactoring (CC-1 fix) — must be done as a single atomic change, not spread across phases.

---

### CRIT-2: Breaking the EAV Reconstruction Logic When Splitting the VCM API Route

**What goes wrong:** `src/app/api/vcm/route.ts` (387 lines) fetches ALL rows via `queryAll('vcm')`, then reconstructs typed domain objects in memory by grouping on `row.category`. The reconstruction assumes a specific set of `category` string values (`'vcmVersion'`, `'appDemand'`, `'deviceWaferDemand'`, etc.) that are hardcoded in both the API route and the seed script. When splitting this file into smaller modules (e.g., extracting `buildApplicationDemands()` into a separate file), any rename of these string constants in one place without updating the other breaks the reconstruction silently — the resulting objects have empty arrays rather than throwing an error.

**Why it happens:** EAV pattern (Entity-Attribute-Value) with string literal keys has no compile-time enforcement. TypeScript types the output (`VcmData`, `ApplicationDemand`, etc.) but cannot catch a mismatch between the DB row's `category` string and the code checking `byCategory['appDemand']`.

**Consequences:** VCM tab renders with empty charts. No error is thrown — `byCategory['appDemand'] ?? []` returns `[]`, which produces zero-length arrays that Recharts renders as blank. The bug is invisible until a human looks at the tab.

**Prevention:**
- Before splitting, extract category key strings into a shared constants file (e.g., `src/lib/vcm-categories.ts`). Both the seed script and the API reconstruction logic must import from this file.
- Write a test for `buildApplicationDemands()` that asserts non-empty output for known fixture rows before moving the function.
- After every structural change to the VCM route, assert `vcmData.versions.length > 0` in a smoke test against the local SQLite DB.

**Detection warning signs:** VCM tab shows blank bars with no loading spinner and no error message. `console.log` of the API response shows correct structure with empty arrays.

**Phase:** VCM API route splitting. Also relevant when extracting seed script logic.

---

### CRIT-3: Dark Mode Breaking Across Newly Split Components

**What goes wrong:** The current dark mode system uses TWO mechanisms simultaneously:

1. `globals.css` line 3: `@custom-variant dark (&:where(.dark, .dark *));` — this is the Tailwind 4 custom variant for `dark:` utility classes inside components.
2. Direct CSS overrides in `globals.css` (lines 16-100+): `.dark .bg-white { background-color: #1e293b; }` etc. — these override non-prefixed Tailwind classes.

When splitting a god component (e.g., `ExternalComparison.tsx` at 1254 lines) into child components, any child component that uses non-prefixed Tailwind classes (e.g., `bg-white`, `text-gray-900`) relies on the CSS cascade from `globals.css`. If a developer adds a new class to a split component using the `dark:` prefix (e.g., `dark:bg-slate-800`) instead of the override pattern, the two mechanisms conflict. The class override in `globals.css` may win (higher specificity) and the `dark:` variant class is silently ignored.

**Why it happens:** `@custom-variant dark (&:where(.dark, .dark *))` uses `:where()` which has zero specificity. The `.dark .bg-white` overrides in globals.css use class selectors (specificity 0,2,0). The override always wins, but developers writing new code naturally reach for `dark:` Tailwind prefixes, creating an inconsistent system that only partially works.

**Consequences:** New or split components look correct in light mode but fail to update colors in dark mode. The failure is invisible in CI (no visual regression tests). The project CLAUDE.md explicitly warns: "Do NOT use `:where(.dark)` as it has zero specificity."

**Prevention:**
- Establish a single rule before splitting: all dark mode overrides go in `globals.css` using `.dark .class-name` pattern. No `dark:` prefixes on any new or modified component.
- Add a lint rule or code review checklist item: grep for `dark:` in any new component code.
- When testing a split component, toggle dark mode and visually verify every background, text, and border color.

**Detection warning signs:** A split component has some elements with correct dark mode and others stuck in light-mode colors. Usually backgrounds override correctly (via globals.css) but newly added elements do not.

**Phase:** Every god-component split phase. Risk is highest for ExternalComparison, MonthlyMetricsChart, and DemandBarChart.

---

### CRIT-4: Stale Closure in the Extracted `useAiInsight` Hook

**What goes wrong:** The three AI insight implementations (IndicatorChart.tsx line 165, ExternalComparison.tsx line 522, DemandBarChart.tsx line 251) all suppress `react-hooks/exhaustive-deps` warnings with `// eslint-disable-line`. When extracting these into a shared `useAiInsight` hook, the suppression must NOT be carried over. If the hook's `useEffect` captures a stale version of the `context` data (the serialized chart data sent to the AI endpoint), it will POST the wrong data — specifically, it may send empty arrays from the initial render rather than the populated data from after the fetch completes.

**Why it happens:** The current pattern uses `useRef` (`aiLoadingRef`) to guard against double-fetches, plus a `fetchAiInsight` function defined inside the component that captures current state via closure. When this moves to a hook, the `fetchAiInsight` reference inside `useEffect` becomes stale unless wrapped in `useCallback` with correct dependencies.

**Consequences:** AI insight panel opens and shows a response, but the analysis describes empty or stale data. No error is thrown. This is a semantic bug — the API call succeeds, Claude returns a response, but the response is wrong. Extremely hard to detect without reading the AI output carefully.

**Prevention:**
- When writing `useAiInsight`, make `context` (the data payload) an explicit parameter, not captured from outer scope.
- Wrap the fetch function in `useCallback` with `[context]` as a dependency.
- Remove all `eslint-disable` suppressions. If ESLint still warns, the dependencies are wrong — fix them rather than suppress.
- Write a test that changes the `context` prop and asserts a new fetch is triggered.

**Detection warning signs:** AI insight panel shows correct loading state but the returned analysis mentions data points that don't match what's currently displayed in the chart.

**Phase:** `useAiInsight` hook extraction (HP-4 fix).

---

## Moderate Pitfalls

Mistakes that cause degraded behavior or regressions requiring a targeted fix.

---

### MOD-1: Recharts Breaking on Undefined vs Null vs Missing Data Keys

**What goes wrong:** Recharts is highly sensitive to the shape of data objects passed to `<Bar>`, `<Line>`, and `<ComposedChart>`. In `DemandBarChart.tsx`, the `chartData` array is built in a `useMemo` that maps `filteredData` and joins in `waferRows` (line 116). If the data key for a `<Bar>` or `<Line>` (e.g., `dataKey="primary"`) is present on some objects but missing entirely from others (not `null`, not `0`, but the key doesn't exist), Recharts renders that bar/line as absent without error. If the key exists but is `undefined`, Recharts may render `NaN` on the axis.

**Why it happens:** When extracting chart configuration objects into separate files (to reduce god-component size), developers sometimes change `value ?? 0` to `value` or restructure the data shape. The change is type-safe at the TypeScript level (the field is typed as `number | undefined`), but Recharts behavior changes silently.

**Consequences:** Bars disappear or render at height 0. Y-axis scale changes because the domain calculation skips undefined values. Label overlays (LabelList) show `undefined` as text.

**Prevention:**
- When refactoring chart data construction, maintain explicit `?? 0` fallbacks for every numeric key passed to Recharts.
- After any restructuring of `chartData` or `mountData`, visually compare before/after screenshots — especially for dual-bar charts and right-axis line overlays.
- Keep the `filteredSecondary` alignment logic intact: the current pattern of `match ?? { year: d.year, value: 0, isEstimate: d.isEstimate }` is intentional.

**Detection warning signs:** A bar chart that previously showed bars now shows an empty chart area. The tooltip still shows correct values but bars are invisible (height 0).

**Phase:** DemandBarChart and IndicatorChart extraction.

---

### MOD-2: Seed Script Running Silently on `npm install` and Overwriting Real Data

**What goes wrong:** `package.json` `"postinstall": "npx tsx scripts/seed.ts"` runs on every `npm install`. The seed script calls `getDb()` which uses `ensureSchema()` and then inserts rows. If the seed script uses `INSERT OR REPLACE` or `DELETE` + `INSERT`, any manually loaded real data in `data/dashboard.db` is overwritten silently. The current seed script imports from mock data files (`vcm-mock.ts`, `customer-detail-mock.ts`, `supply-chain-mock.ts`) — if those mock files are removed or cleaned up during the refactoring (LP-2 fix), the `postinstall` hook will fail on every `npm install`, breaking the development setup.

**Why it happens:** The postinstall hook was added for convenience during initial development. It creates a chicken-and-egg problem: mock data files cannot be deleted while postinstall still references them.

**Consequences:** (a) Deleting mock files breaks `npm install` for all developers. (b) Running `npm install` after loading real data resets the database. (c) Vercel deployment runs `npm install`, which runs the seed and potentially overwrites production state (if Postgres is accessible during build — unlikely but possible).

**Prevention:**
- Remove the `postinstall` hook BEFORE deleting mock data files. Do these in the same phase.
- Replace with explicit `npm run seed` in the developer setup docs.
- Add a guard in seed.ts: `if (process.env.NODE_ENV === 'production') { process.exit(0); }` as a safety net until the hook is removed.
- Sequence: (1) remove postinstall hook, (2) verify `npm install` works, (3) then clean up mock files.

**Detection warning signs:** After a teammate runs `npm install`, real data is gone. Vercel build logs show `Running seed.ts` during the install phase.

**Phase:** Data loading UX improvement phase (MP-6 fix + LP-2 fix must be coordinated).

---

### MOD-3: File Cache Behavior Change Breaks Local Development After Refactoring

**What goes wrong:** `src/lib/cache.ts` writes JSON files to `./cache/` (relative to `process.cwd()`). The 112 existing cache files contain AI insight and news summary responses. If the cache key generation logic is changed (e.g., switching MD5 to SHA-256 for LP-3, or changing how the context string is built in the AI insight route), all existing cached responses become orphaned. Local development then hits Anthropic and Tavily APIs on every request until new cache files accumulate — generating costs and slowing down dev iteration.

**Why it happens:** Cache keys are opaque hashes. There's no cache versioning. Changing the hash function changes all keys simultaneously with no migration path.

**Consequences:** 24 hours of elevated API costs during re-warming. If Tavily rate limits are hit during development, transcript fetches fail. Orphaned cache files accumulate (already 112 files, this adds more).

**Prevention:**
- When changing cache key generation (MD5 → SHA-256), run `npm run cache:clear` (or manually delete `./cache/`) immediately after. Document this in the PR description.
- Do not change the hash function and the context serialization format in the same commit — isolate the change so cache invalidation is intentional and visible.
- Add a cache version prefix to all keys: `const cacheKey = \`v2:${hash}\`;` so future changes only require bumping the prefix.

**Detection warning signs:** All API endpoints hit Anthropic/Tavily on every request after a specific commit. Cache directory grows with new files alongside old ones with different filename patterns.

**Phase:** Any phase that touches `src/lib/cache.ts` or AI insight routes.

---

### MOD-4: `useDarkMode` Hook Called Multiple Times Creates Desynchronized `isDark` State

**What goes wrong:** `useDarkMode` in `src/hooks/useDarkMode.ts` is not a singleton — it creates independent `useState(false)` instances in every component that calls it. Currently, 23 components are `'use client'` and multiple of them call `useDarkMode()`. When dark mode is toggled, all instances update synchronously via the DOM class toggle, which is correct. However, if during god-component splitting a developer adds `useDarkMode()` to a newly extracted child component without realizing the parent already passes `isDark` as a prop, there are now two sources of truth. The child's `isDark` initializes to `false` on first render (before the `useEffect` reads localStorage), causing a flash of light-mode styling in dark mode.

**Why it happens:** The `useEffect` in `useDarkMode` runs after the first render. Components that derive their initial render from `isDark` (e.g., Recharts `tickFill` and `tooltipStyle` colors) render once with `isDark = false`, then re-render after the effect. In a top-level component this flash is acceptable. In a deeply nested child called during a modal or panel open, the re-render is visible.

**Consequences:** Newly split chart sub-components flash with light-mode Recharts colors (black tick labels, white backgrounds) for one render cycle when first mounted in dark mode.

**Prevention:**
- For chart sub-components, pass `isDark` as a prop from the parent rather than calling `useDarkMode()` again.
- Reserve `useDarkMode()` calls for top-level page components (`SupplyChainPage`, `VcmPage`, `CustomerDetailPage`) and `V3Container`.
- Rule of thumb: if a component receives any props, it should accept `isDark: boolean` as a prop rather than reading from the hook.

**Detection warning signs:** After splitting a chart component, a brief flicker of wrong colors occurs when toggling between tabs or opening panels in dark mode.

**Phase:** Every god-component split phase. Highest risk for Recharts chart components.

---

### MOD-5: Test Setup Against SQLite Hits the Real Database File

**What goes wrong:** When adding tests for `src/lib/db.ts` (HP-1 fix), the `getSqliteDb()` function uses `path.join(process.cwd(), 'data', 'dashboard.db')`. If tests are run without mocking `better-sqlite3`, they open and modify the real local database. A test that calls `ensureSchema()` followed by INSERT will permanently add rows to `data/dashboard.db`.

**Why it happens:** `vitest.config.ts` exists but has no module aliases or mock setup for the database. The `getDb()` function computes the path at call time using `process.cwd()`, which in the Vitest context resolves to the project root — the same location as the real database.

**Consequences:** Running `npm test` corrupts local development data. More insidiously: tests pass because they read their own inserted data, but the local dashboard now shows test data mixed with real data.

**Prevention:**
- Before writing any DB tests, set up a Vitest mock for `better-sqlite3` using `vi.mock('better-sqlite3')` or use a `:memory:` database with a different path in test environment: `process.env.DB_PATH = ':memory:'` and check it in `getSqliteDb()`.
- Add `VITEST=true` to the test environment in `vitest.config.ts` and guard `getSqliteDb()`: `const dbPath = process.env.VITEST ? ':memory:' : DB_PATH`.
- Never call `getDb()` (the seed singleton) in test files — it shares state across tests.

**Detection warning signs:** After `npm test`, the local dashboard shows unexpected rows or duplicate data. `data/dashboard.db` mtime updates when running tests.

**Phase:** Test addition phase (HP-1). Must be established before writing first DB test.

---

### MOD-6: Postgres Query Reconstruction Diverges from SQLite During Refactoring

**What goes wrong:** `src/lib/db.ts` has two code paths: `isPostgres()` routes to `pgQueryRaw()`, and the else branch uses `better-sqlite3`. The logic inside `queryMetrics()`, `queryMetricsIn()`, `queryMetricsLike()`, `queryByCustomer()` is duplicated for both paths. When fixing CC-1 (singleton pattern), only the SQLite path changes. When adding new query capabilities (e.g., pagination for HP-5), a developer may implement it for SQLite but forget the Postgres path — or implement it with different semantics (e.g., SQLite uses `LIMIT`/`OFFSET`, Postgres uses cursor-based).

**Why it happens:** There are no shared integration tests that run the same query assertions against both backends. The divergence is invisible until deploying to Vercel.

**Consequences:** A refactored query works correctly in local development (SQLite) and fails silently on Vercel (Postgres) — returning empty arrays or partial data. The bug is only visible in production.

**Prevention:**
- For every change to a query function, update BOTH the SQLite and Postgres branches in the same commit.
- Add a test fixture that runs each query function and asserts the same output shape regardless of backend.
- When adding parameters (pagination, filters), write a comment above the SQLite branch: `// POSTGRES EQUIVALENT BELOW — keep in sync`.

**Detection warning signs:** Dashboard works locally but shows empty tabs on the Vercel deployment. Vercel function logs show no errors (the Postgres query runs and returns `[]` rather than throwing).

**Phase:** DB layer refactoring and any phase that modifies query functions.

---

## Minor Pitfalls

Mistakes that cause cosmetic issues, build warnings, or minor developer friction.

---

### MIN-1: Moving Mock Data Files Breaks `seed.ts` Import Paths

**What goes wrong:** `scripts/seed.ts` imports directly from `src/data/vcm-mock.ts`, `src/data/customer-detail-mock.ts`, and `src/data/supply-chain-mock.ts`. If these files are moved to `src/fixtures/` or `tests/fixtures/` during LP-2 cleanup, the seed script's TypeScript imports break and `npm run seed` fails. This is especially problematic if the seed script is the only tool available to reload the local database after clearing it.

**Prevention:** Update seed.ts import paths in the same commit as the file move. Verify with `npx tsx scripts/seed.ts --dry-run` before committing.

**Detection warning signs:** `npm run seed` fails with `Cannot find module '../src/data/vcm-mock'` after a file reorganization commit.

**Phase:** Mock data cleanup (LP-2).

---

### MIN-2: `suppressHydrationWarning` Hides Real Bugs During Component Restructuring

**What goes wrong:** `src/app/layout.tsx` has `suppressHydrationWarning` on the `<html>` element. During refactoring, if a component is accidentally given different server/client rendering paths (e.g., it reads `localStorage` at module level instead of inside `useEffect`), the resulting hydration mismatch is silently swallowed. The bug manifests as visual glitches that are impossible to trace.

**Prevention:** Whenever adding a new client-side-only read (localStorage, window, navigator) to any component, double-check it is inside `useEffect` or guarded by `typeof window !== 'undefined'`. Do not trust the absence of hydration warnings as proof of correctness.

**Detection warning signs:** A component flickers on initial load despite no visible error in the console.

**Phase:** Any phase restructuring components that access browser APIs (especially `useDarkMode` consumers).

---

### MIN-3: Empty Catch Blocks Mask Failures During Refactoring

**What goes wrong:** Multiple empty `catch {}` blocks in `src/lib/cache.ts` (4 instances) and `src/app/api/transcript/route.ts` (3 instances) cause failures during refactoring to be invisible. If a file move, import path change, or type change causes a runtime error in a cached code path, the error is swallowed and the function returns `null` (cache miss). The refactoring appears to work, but performance degrades silently.

**Prevention:** Before touching any function with an empty catch block, temporarily add `console.error('[debug]', err)` to make failures visible. Remove the debug log after verifying the refactored path works. Do not leave the catch empty in refactored code — replace with `console.error('[cache]', err)` at minimum.

**Detection warning signs:** Cache hit rate drops to 0% after a code change. API latency increases (every request is a cache miss). No errors in logs.

**Phase:** Cache layer refactoring (MP-1) and any adjacent touches.

---

### MIN-4: Type Imports Becoming Runtime Imports After Module Restructuring

**What goes wrong:** The VCM API route imports 15+ types from `@/types/indicators` using `import type { ... }`. If during god-component splitting these are restructured to `import { ... }` (without the `type` keyword), TypeScript `isolatedModules` mode (used by Next.js/Turbopack) may still compile successfully, but Vercel's production build may emit warnings or behave differently regarding tree-shaking. More critically, if a constant that belongs in a types file is accidentally moved there alongside the type (e.g., `APP_LABEL_MAP` or `INITIAL_DEVICE_FILTERS` from VcmPage.tsx), it becomes a runtime dependency that inflates the client bundle.

**Prevention:** Keep `import type` syntax on all type-only imports throughout refactoring. When extracting constants from god components, place them in a dedicated constants file (e.g., `src/lib/vcm-constants.ts`), not in `src/types/`.

**Detection warning signs:** `npm run build` output shows bundle size increase after a restructuring commit. TypeScript emits "This is a type-only import/export" warnings.

**Phase:** VcmPage and CustomerDetailPage splitting.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| SQLite singleton fix (CC-1) | CRIT-1: second connection opened, silent empty results | Change all query functions atomically; remove `db.close()` in same PR |
| VCM API route splitting | CRIT-2: EAV category strings mismatched | Extract string constants first, test reconstruction before splitting |
| God component splitting (any) | CRIT-3: dark mode breaks via `dark:` prefix on new elements | Enforce `.dark` global override pattern; grep for `dark:` in PR review |
| `useAiInsight` hook extraction | CRIT-4: stale closure sends wrong data to Claude | Make `context` an explicit param; remove all eslint-disable suppressions |
| Recharts chart extraction | MOD-1: undefined vs null data keys break bar rendering | Maintain `?? 0` fallbacks; visual check after every chart refactor |
| Mock data cleanup + postinstall removal | MOD-2: `npm install` breaks or resets real data | Remove postinstall hook BEFORE deleting mock files, in same phase |
| Cache layer refactoring | MOD-3: hash function change orphans all cache files | Clear cache directory after hash change; add version prefix to keys |
| Chart sub-component creation | MOD-4: extra `useDarkMode()` call causes render flash | Pass `isDark` as prop from parent; do not call hook in sub-components |
| DB layer test addition | MOD-5: tests modify real `dashboard.db` | Set up `:memory:` DB path in vitest config before writing any DB test |
| Any query function change | MOD-6: SQLite and Postgres paths diverge | Update both branches in same commit; comment sync requirement |
| Mock data file moves | MIN-1: seed.ts import paths break | Update seed.ts in same commit as file move |
| Component restructuring with browser APIs | MIN-2: hydration mismatch hidden by suppressHydrationWarning | Guard all browser APIs with useEffect or typeof window check |
| Cache/transcript route refactoring | MIN-3: empty catch blocks hide refactoring errors | Add temporary console.error during refactoring; verify then remove |
| Type file reorganization | MIN-4: `import type` dropped, constants in types file | Keep `import type`; use dedicated constants files |

---

*Pitfalls audit: 2026-03-29 | Based on direct codebase reading*
