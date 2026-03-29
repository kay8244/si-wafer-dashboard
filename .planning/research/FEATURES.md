# Feature Landscape

**Domain:** Next.js/React/TypeScript dashboard refactoring
**Researched:** 2026-03-29
**Confidence:** HIGH (patterns verified against official docs and multiple sources)

---

## Scope Reminder

This is a **refactoring** project, not a feature project. "Features" here means refactoring work
items — the things this milestone must accomplish. Categories follow the same table-stakes /
differentiators / anti-features taxonomy but applied to code improvement work.

The three goals from PROJECT.md:
1. Code readability (naming, comments, structure)
2. Code quality (deduplication, error handling, type safety)
3. Data loading UX for developers (CLI-based data seeding)

---

## Table Stakes

Refactoring work that any serious production codebase requires. Skipping these leaves critical
correctness or safety problems in place.

| Work Item | Why Required | Complexity | Source in Codebase |
|-----------|-------------|------------|-------------------|
| Fix SQLite singleton connection (CC-1) | Every API request leaks a connection; `EMFILE` / `SQLITE_CANTOPEN` under load | Low | `src/lib/db.ts` lines 42–49, 96–211 |
| Add React Error Boundaries (CC-4) | Any unhandled Recharts render error crashes the entire app to white screen | Low | `src/app/`, `src/components/V3Container.tsx` |
| Extract `useAiInsight` shared hook (HP-4) | Identical fetch + state + eslint-disable pattern duplicated in 3 components; bugs fixed in one place don't propagate | Medium | `IndicatorChart`, `ExternalComparison`, `DemandBarChart` |
| Remove or archive mock data files (LP-2) | ~2400 lines of dead/legacy code in production bundle; confuses future developers | Low | `src/data/vcm-mock.ts`, `customer-detail-mock.ts`, `supply-chain-mock.ts` |
| Fix `postinstall` auto-seed on every `npm install` (MP-6) | Runs seed on Vercel deploys; risks overwriting production data; slows CI | Low | `package.json` line 15 |
| Move `@types/*` and `eslint` to `devDependencies` (MP-2) | Type-only and tooling packages inflate production `node_modules` | Low | `package.json` lines 21–22, 25–26 |
| Add Zod validation to AI/proxy API endpoints (HP-2) | `/api/ai-insight` accepts arbitrary context strings forwarded to Anthropic; no size limit = prompt injection and cost abuse | Medium | `src/app/api/ai-insight/route.ts`, `transcript/route.ts`, `news/route.ts` |
| Fix silent error swallowing in catch blocks (MP-3) | 10+ empty or bare `console.warn` catch blocks make production failures invisible | Low | `src/lib/cache.ts`, `src/app/api/supply-chain/route.ts`, `src/app/api/transcript/route.ts` |
| Resolve `eslint-disable react-hooks/exhaustive-deps` suppressions (LP-5) | 4 suppressed dependency warnings hide potential stale closure bugs | Medium | `IndicatorChart`, `SupplyChainPage`, `ExternalComparison`, `DemandBarChart` |

### Notes on Table Stakes

**CC-1 (SQLite connection leak)** is the single highest-priority item. The fix is well-understood:
one module-level singleton via `let _db: Database | null = null` with lazy initialization, reused
across all query functions. The inconsistent `db.close()` call in `queryAll()` should also be
removed once the singleton is in place.

**CC-4 (Error Boundaries)** maps directly to the Next.js App Router convention: create
`src/app/error.tsx` (must be `'use client'`) to catch errors at the root segment. For finer
isolation, wrap each tab component (`SupplyChainPage`, `VcmPage`, `CustomerDetailPage`) separately.
The `error.tsx` file receives `{ error, reset }` props — `reset` allows the user to retry without
a full page reload.

**HP-4 (useAiInsight)** fixes three bugs at once: removes four `eslint-disable` suppressions, gives
a single place to improve the auto-refetch logic, and reduces total lines by ~200. This is the
highest-leverage single refactor.

---

## Differentiators

Patterns that significantly improve long-term maintainability beyond the minimum. Not strictly
required to ship, but each has clear value and bounded scope.

| Work Item | Value Proposition | Complexity | Dependency |
|-----------|------------------|------------|------------|
| Decompose God Components (HP-3) | `ExternalComparison` (1254 lines), `MonthlyMetricsChart` (799 lines), `DemandBarChart` (718 lines) become reviewable, testable units; single-responsibility components are much easier to modify safely | High | Requires `useAiInsight` hook first |
| Add tests for critical path: DB layer + API data reconstruction (HP-1) | Zero tests currently; `buildCustomerExecutive()` and VCM data reconstruction are the most complex untested logic; tests act as regression safety net for the rest of the refactoring | High | Should be done before or alongside God Component decomposition |
| Add API route authentication (CC-2) | All routes are currently public; an internal-tool header check (e.g., `X-Internal-Token`) in `src/middleware.ts` is sufficient for the dashboard's use case without adding a full auth system | Medium | None |
| Add rate limiting to AI proxy endpoints (CC-3) | Prevents accidental or malicious exhaustion of Anthropic/Tavily quotas; on Vercel serverless, in-memory rate limiting doesn't survive cold starts — use `@upstash/ratelimit` with Vercel KV for a persistent token bucket | Medium | None (independent) |
| Replace file cache with DB-backed or KV cache in production (MP-1) | `./cache/` directory is ephemeral on Vercel serverless; the transcript endpoint's DB-cache pattern is the right model to extend to AI insight responses | Medium | CC-1 must be fixed first (DB layer must be stable) |
| Structured logging with request correlation (LP-4) | Replace scattered `console.error('[tag]...')` with a consistent log object shape `{ level, tag, message, err, requestId }` — enables meaningful Vercel log filtering without adding a full logging library | Low | None |
| Replace MD5 cache key hash with SHA-256 (LP-3) | One-line change; removes a cryptographically broken algorithm from the codebase even if only used for cache keys | Low | None |
| Scope `suppressHydrationWarning` narrowly (MP-5) | Currently suppresses all hydration warnings on `<html>` element; move to `<body>` or adopt cookie-based dark mode to eliminate the mismatch at its source | Medium | None |
| CLI seed developer UX improvements | Document and organize `scripts/seed.ts` as an explicit `npm run seed` command with clear flags: `--clear` to reset, `--env local\|prod` to target environment, dry-run output | Medium | None |
| Consistent SQLite connection management (MP-4) | After CC-1 is fixed, remove the lone `db.close()` in `queryAll()` and document the singleton pattern in a file-level comment in `db.ts` | Low | Depends on CC-1 |

### Notes on Differentiators

**God Component decomposition** is the most visible readability improvement but also the highest
risk. The correct sequence: (1) extract `useAiInsight` hook, (2) write tests for any extracted
logic, (3) then split the rendering. Reversing this order makes the decomposition untestable and
regression-prone.

**Testing strategy** should target the data reconstruction path, not the UI. Priority order from
CONCERNS.md:
1. `src/lib/db.ts` — mock `better-sqlite3`, test query builders
2. `src/app/api/vcm/route.ts` — test `MetricRow[]` → `VcmData` reconstruction
3. `src/app/api/customer-detail/route.ts` — test `buildCustomerExecutive()`
4. `src/lib/cache.ts` — test TTL, file vs. memory fallback behavior

**CLI seed UX**: The `postinstall` hook must be removed (table stakes) before improving the seed
UX. The improved experience is: explicit `npm run seed` with an `--env` flag, a `npm run seed:clear`
variant, and a short `SEEDING.md` in `scripts/` explaining what each command does and what data it
expects. No interactive prompts — developers prefer composable flags.

---

## Anti-Features

Refactoring work that sounds productive but introduces more problems than it solves in this
specific codebase.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Big-bang God Component decomposition (all three at once) | Splitting 1254 + 799 + 718 lines simultaneously creates a large diff with no regression safety net; one merge conflict can corrupt all three | Decompose one component per phase, starting with the least complex (`DemandBarChart`) after `useAiInsight` is extracted |
| Introducing React Query or SWR | PROJECT.md explicitly marks this Out of Scope; it changes client-side caching architecture, which is a feature addition not a refactor | Keep raw `fetch` in hooks; improve the existing `useXxxData` hook shape instead |
| Barrel files (`index.ts`) for component directories | The codebase has zero barrel files by convention; adding them now creates circular dependency risk and complicates tree-shaking without solving any real problem | Keep direct file imports with `@/` alias as established in CONVENTIONS.md |
| Adding Prettier | No Prettier config currently exists; retroactively reformatting 14k lines creates a massive blame-polluting diff that obscures real logic changes | If formatting consistency is desired, add it as a separate commit at the end of the milestone, never mid-refactor |
| Migrating all components from `'use client'` to React Server Components | Requires fundamental data-fetching rearchitecture; all 30 client components would need redesign; far outside refactoring scope | Leave client rendering as-is; the one optimization available is memoizing expensive computations with `useMemo` inside existing client components |
| Adding URL-based tab routing | PROJECT.md marks this Out of Scope as a feature change, not a refactoring | Leave tab state as `useState` in `V3Container.tsx` |
| Extracting a shared `useFetch` generic hook | Tempting abstraction but the existing hooks each have meaningfully different error handling and response shapes; a generic `useFetch<T>` adds indirection without removing duplication | Keep per-domain hooks (`useVcmData`, `useSupplyChainData`, etc.); extract `useAiInsight` specifically because it is genuinely identical in all three usages |
| Pagination refactoring (HP-5) | Worthwhile long-term, but requires API contract changes that could break existing client hooks; high regression risk without significant test coverage | Defer to post-refactoring milestone once test coverage exists |
| Full accessibility (a11y) pass | Explicitly Out of Scope; internal tool | Separate milestone |

---

## Feature Dependencies

The dependency graph for safe execution order:

```
CC-1 (SQLite singleton)
  └── MP-4 (consistent connection management — cleanup after CC-1)
  └── MP-1 (file cache → DB cache — DB layer must be stable first)

HP-4 (useAiInsight hook extraction)        ← do this BEFORE God Component splits
  └── LP-5 (eslint-disable suppressions — resolved by the hook)
  └── HP-3 (God Component decomposition — DemandBarChart, ExternalComparison)

CC-4 (Error Boundaries)                    ← independent, do early
HP-2 (Zod validation)                      ← independent, do early
CC-2 (Auth middleware)                     ← independent
CC-3 (Rate limiting)                       ← independent, requires Upstash KV if on Vercel
MP-6 (remove postinstall seed)             ← independent, do immediately
LP-2 (remove mock data files)              ← verify no imports first, then delete
MP-2 (devDependencies fix)                 ← independent, one-line change

HP-1 (tests) → should run in parallel with HP-3 (God Component decomposition)
  Write tests for a function BEFORE extracting it

CLI seed UX improvements                   ← after MP-6 is done
```

---

## MVP Recommendation

If the milestone is timeboxed, prioritize in this order:

**Phase 1 — Critical fixes (unblock everything else):**
1. CC-1: SQLite singleton
2. CC-4: Error Boundaries
3. MP-6: Remove `postinstall` seed hook
4. LP-2: Remove / archive mock data files
5. MP-2: Move `@types/*` to devDependencies

**Phase 2 — Core quality (the meaningful refactoring):**
6. HP-4: Extract `useAiInsight` hook (resolves LP-5 as a side effect)
7. HP-2: Zod validation on AI endpoints
8. MP-3: Fix silent catch blocks

**Phase 3 — Readability and developer UX:**
9. HP-3: God Component decomposition (one component at a time, starting with `DemandBarChart`)
10. HP-1: Tests for DB layer and API data reconstruction
11. CLI seed UX: explicit `npm run seed`, documentation

**Defer (post-milestone):**
- CC-2 (auth), CC-3 (rate limiting): valid but require infrastructure decisions (Upstash KV, token strategy)
- MP-1 (file cache → KV): depends on rate limiting infrastructure being chosen
- HP-5 (pagination): requires test coverage first

---

## Sources

- React official docs — custom hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
- Next.js App Router error handling: https://nextjs.org/docs/app/getting-started/error-handling
- Next.js error.js file convention: https://nextjs.org/docs/app/api-reference/file-conventions/error
- Zod validation with Next.js API routes: https://dub.co/blog/zod-api-validation
- Upstash rate limiting on Vercel: https://upstash.com/blog/edge-rate-limiting
- better-sqlite3 singleton discussion: https://github.com/WiseLibs/better-sqlite3/issues/1155
- React anti-patterns (god components, premature abstraction): https://itnext.io/6-common-react-anti-patterns-that-are-hurting-your-code-quality-904b9c32e933
- Against big-bang rewrites: https://dev.to/ojsholly/the-case-against-rewrites-how-i-evolved-a-5-year-old-backend-codebase-and-why-you-probably-25dl
- TypeScript dead code removal (ts-prune): https://effectivetypescript.com/2020/10/20/tsprune/
- Database seed script best practices: https://www.freecodecamp.org/news/how-to-build-database-seed-scripts-for-your-node-application/
- CodeScene on custom hook refactoring: https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks
