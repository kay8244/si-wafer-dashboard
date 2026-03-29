# Phase 1: Foundation Fixes - Research

**Researched:** 2026-03-29
**Domain:** SQLite connection management, React error boundaries, Next.js App Router error handling, package.json hygiene, mock data organization
**Confidence:** HIGH

## Summary

Phase 1 addresses six foundational issues that create runtime risks and build pollution in the SI Wafer Dashboard codebase. The most critical fix is the SQLite connection leak (CC-1) where `getSqliteDb()` creates a new `better-sqlite3` connection on every call across 5 query functions, never closing most of them. The fix is a well-understood singleton pattern using `globalThis` for HMR safety. The second major deliverable is React error boundaries -- both Next.js App Router `error.tsx`/`global-error.tsx` files and per-chart `ErrorBoundary` class components wrapping 12 Recharts chart components across 3 tabs. The remaining tasks are mechanical: removing `postinstall`, moving mock data files, and reclassifying devDependencies.

All six requirements use standard, well-documented patterns with no experimental APIs. The codebase already has a partial singleton pattern (`_seedDb` in `getDb()`) that serves as a reference. React class component error boundaries remain the only option in React 19 for catching render errors. The `react-error-boundary` library (v6.1.1) is an option but the CONTEXT.md leaves this decision to Claude's discretion.

**Primary recommendation:** Implement a `globalThis`-cached singleton for `better-sqlite3`, create a reusable `ChartErrorBoundary` class component, add Next.js error files using the `reset` prop (not `unstable_retry` which requires Next.js 16.2+), and perform the mechanical cleanup tasks (postinstall, mock move, devDeps).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Error boundary wraps each chart individually -- one chart failure must not affect others
- **D-02:** Fallback UI: Korean error message "차트를 표시할 수 없습니다" + retry button. Error details go to console.error only
- **D-03:** Both error.tsx and global-error.tsx must be created. error.tsx for page-level, global-error.tsx for root layout
- **D-04:** Mock data files moved to test fixtures (not deleted). Must be removed from production bundle
- **D-05:** Dev/demo environment uses mock data; production switches to API. Environment separation is key
- **D-06:** postinstall hook removed. Seed becomes explicit manual `npm run seed`. Environment variable controls mock vs real DB
- **D-07:** Seed script designed for future API data sources. Phase 1 implements mock-based seed only, but abstracts data source for extensibility

### Claude's Discretion
- SQLite singleton implementation specifics (module-level variable, process.exit handling, etc.)
- devDependencies package selection for migration
- ErrorBoundary implementation: class component vs react-error-boundary library
- Mock file destination directory structure

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUN-01 | SQLite singleton connection pattern | globalThis singleton pattern with process.exit cleanup; existing `_seedDb` pattern as reference |
| FOUN-02 | Next.js App Router error.tsx + global-error.tsx | Next.js 16.1.6 uses `reset` prop (not `unstable_retry`); must be 'use client'; global-error needs own html/body |
| FOUN-03 | Chart component error boundary wrapping | React 19 class component ErrorBoundary; 12 chart files across 3 tabs identified for wrapping |
| FOUN-04 | postinstall hook removal | Remove line from package.json scripts; seed.ts remains unchanged as `npm run seed` |
| FOUN-05 | Mock data file relocation | 3 files in src/data/ imported only by scripts/; move to fixtures directory outside src/ |
| FOUN-06 | devDependencies classification fix | 6 packages identified: @types/node, @types/react, @types/react-dom, eslint, eslint-config-next, typescript |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack locked:** Next.js 16.1 / React 19 / Recharts 3.7 / Tailwind 4.1 / TypeScript 5.9
- **Build verification:** All changes must pass `npm run build` with zero errors
- **Debug limit:** 3 retries max per error, then summarize and ask
- **Dark mode:** Use `.dark` class directly, never `:where(.dark)`
- **No console.log:** Only `console.error` / `console.warn` in production code
- **Import style:** Use `@/` alias for cross-directory, `./` for siblings only
- **Components:** `export default function` pattern, never arrow function exports

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.8.0 | SQLite database driver | Already in use; singleton pattern fix only |
| react | 19.2.4 | UI library | Class component ErrorBoundary support confirmed |
| next | 16.1.6 | Framework | error.tsx/global-error.tsx conventions |
| recharts | 3.7.0 | Charts | Components to be wrapped with ErrorBoundary |

### Supporting (decision: Claude's discretion)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-error-boundary | 6.1.1 | Declarative error boundaries | OPTIONAL -- simplifies ErrorBoundary with hooks API |

**Recommendation on react-error-boundary:** Do NOT add it. The project needs a simple, reusable class component (~40 lines) with a Korean fallback UI. Adding a dependency for this is over-engineering. A custom `ChartErrorBoundary` class component gives full control over the fallback styling (Tailwind classes, dark mode support, Korean text) without learning a library API. The Next.js error.tsx files handle page-level errors separately.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom class ErrorBoundary | react-error-boundary 6.1.1 | Library adds 3KB, provides hooks API; but custom is simpler for this fixed UI pattern |
| globalThis singleton | Module-level variable only | globalThis survives HMR in dev; module-level variable gets re-created on hot reload |

## Architecture Patterns

### Recommended Project Structure (after Phase 1)
```
src/
├── app/
│   ├── error.tsx           # NEW: page-level error boundary
│   ├── global-error.tsx    # NEW: root layout error boundary
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
├── components/
│   ├── ChartErrorBoundary.tsx  # NEW: reusable chart error boundary
│   ├── V3Container.tsx
│   ├── supply-chain/
│   ├── vcm/
│   └── customer-detail/
├── hooks/
├── lib/
│   └── db.ts               # MODIFIED: singleton pattern
├── types/
└── data/                    # EMPTIED: mock files moved out
tests/
└── fixtures/                # NEW: mock data relocated here
    ├── customer-detail-mock.ts
    ├── supply-chain-mock.ts
    └── vcm-mock.ts
scripts/
├── seed.ts                  # MODIFIED: import paths updated
└── seed-postgres.ts         # MODIFIED: import paths updated
```

### Pattern 1: SQLite Singleton with globalThis (FOUN-01)
**What:** Cache the better-sqlite3 connection on `globalThis` to survive Next.js HMR in development, and use a module-level variable for production.
**When to use:** Any native database driver in a Next.js application.
**Implementation:**
```typescript
// src/lib/db.ts
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'dashboard.db');

// Singleton: survives HMR in development
const globalForDb = globalThis as typeof globalThis & {
  _sqliteDb?: import('better-sqlite3').Database;
};

function getSqliteDb(): import('better-sqlite3').Database {
  if (!globalForDb._sqliteDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    globalForDb._sqliteDb = new Database(DB_PATH);
    globalForDb._sqliteDb.pragma('journal_mode = WAL');
  }
  return globalForDb._sqliteDb;
}
```
**Key details:**
- Remove `db.close()` from `queryAll()` -- singleton connections must never be closed by query functions
- The existing `_seedDb` pattern in `getDb()` already demonstrates the approach; extend it to `getSqliteDb()`
- `process.cwd()` is evaluated at call time (first call), not module load time -- safe for Turbopack
- WAL mode pragma set once at connection creation, not per-query
- Source: [Next.js Discussion #26427](https://github.com/vercel/next.js/discussions/26427), [globalThis pattern for Prisma](https://www.robinwieruch.de/next-prisma-sqlite/)

### Pattern 2: Next.js App Router Error Files (FOUN-02)
**What:** Create `error.tsx` and `global-error.tsx` in `src/app/` using Next.js file conventions.
**When to use:** Every Next.js App Router application needs these for production resilience.

**CRITICAL VERSION NOTE:** Next.js 16.1.6 uses the `reset` prop. The `unstable_retry` prop was introduced in 16.2.0. Do NOT use `unstable_retry`.

**error.tsx example:**
```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        페이지를 표시할 수 없습니다
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        일시적인 오류가 발생했습니다.
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  );
}
```

**global-error.tsx example:**
```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold">시스템 오류가 발생했습니다</h2>
          <button
            onClick={reset}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
```
- Source: [Next.js error.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/error)

### Pattern 3: Chart-Level Error Boundary Class Component (FOUN-03)
**What:** A reusable React class component that catches Recharts rendering errors and displays a Korean-language fallback.
**When to use:** Wrap every component that renders a Recharts chart.
**Implementation:**
```typescript
// src/components/ChartErrorBoundary.tsx
'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  chartName?: string;
}

interface State {
  hasError: boolean;
}

export default class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[chart] ${this.props.chartName ?? 'Unknown'} render error:`,
      error,
      errorInfo
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              차트를 표시할 수 없습니다
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Chart components to wrap (12 files with Recharts):**

| Tab | Component | Recharts Usage |
|-----|-----------|---------------|
| supply-chain | IndicatorChart.tsx | LineChart x2 |
| supply-chain | FoundryUtilizationChart.tsx | LineChart |
| supply-chain | ServerLeadingIndicators.tsx | LineChart |
| supply-chain | MemoryPriceIndicators.tsx | LineChart |
| vcm | TotalWaferLineChart.tsx | LineChart |
| vcm | DemandBarChart.tsx | ComposedChart |
| vcm | DeviceStackedChart.tsx | BarChart |
| vcm | VcmPage.tsx | BarChart (inline) |
| customer-detail | ExternalComparison.tsx | LineChart, ComposedChart x2 |
| customer-detail | MonthlyMetricsChart.tsx | ComposedChart |
| customer-detail | EstimateTrendChart.tsx | LineChart |
| customer-detail | IndustryMetricsPanel.tsx | LineChart |

**Wrapping strategy:** Import `ChartErrorBoundary` in the parent page component or the chart component itself, and wrap the `<ResponsiveContainer>` JSX block. Do NOT wrap at a higher level than the individual chart -- per decision D-01.

### Anti-Patterns to Avoid
- **Creating new DB connections per query:** The current `getSqliteDb()` does this. The singleton fix eliminates it.
- **Closing singleton connections:** Remove the `db.close()` call in `queryAll()`. Singleton connections must stay open for the process lifetime.
- **Using `unstable_retry` on Next.js 16.1:** This prop does not exist before 16.2.0. Use `reset` instead.
- **Using `:where(.dark)` in error fallback CSS:** Per CLAUDE.md, use `.dark` class directly for dark mode.
- **Arrow function component exports:** Per project conventions, use `export default class` for the ErrorBoundary (class components) and `export default function` for error.tsx files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Page-level error catching | Custom ErrorBoundary in layout | Next.js `error.tsx` file convention | Framework handles the boundary placement, component hierarchy, and reset lifecycle |
| Root layout error catching | Try-catch in layout.tsx | Next.js `global-error.tsx` file convention | Only way to catch errors in root layout; must include own html/body |
| SQLite connection pooling | Custom pool manager | Module singleton + globalThis | better-sqlite3 is synchronous; pooling is unnecessary. A single connection handles concurrent reads via WAL mode |

**Key insight:** better-sqlite3 is synchronous and thread-safe for reads with WAL mode. There is no need for connection pooling -- a single singleton connection is the correct pattern.

## Common Pitfalls

### Pitfall 1: Next.js HMR Destroys Module-Level Singletons
**What goes wrong:** A module-level `let _db = null` variable gets reset to null on every hot module replacement during development, creating new connections on each file save.
**Why it happens:** Next.js/Turbopack re-evaluates module code on HMR. Module-level variables are re-initialized.
**How to avoid:** Store the singleton on `globalThis` which persists across HMR cycles. Only use `globalThis` caching in development; in production there is no HMR so module-level works fine, but `globalThis` is harmless there too.
**Warning signs:** Multiple `dashboard.db` file handles visible in `lsof` output after saving files during development.

### Pitfall 2: Mock File Imports Break After Relocation
**What goes wrong:** Moving `src/data/*-mock.ts` to `tests/fixtures/` breaks the import paths in `scripts/seed.ts`, `scripts/seed-postgres.ts`, and `scripts/export-mock-data.ts`.
**Why it happens:** These scripts use relative paths (`../src/data/supply-chain-mock`) and `@/data/` alias paths.
**How to avoid:** Update ALL import paths in the 3 script files simultaneously. The `@/` alias only resolves to `./src/*` so moved files outside `src/` need relative paths or a new alias.
**Warning signs:** `npm run seed` fails after file move. Run `npm run seed && npm run build` as verification.

### Pitfall 3: postinstall Removal Breaks Fresh Clone Experience
**What goes wrong:** After removing `postinstall`, a fresh `git clone && npm install` results in no `data/dashboard.db` file, causing runtime errors on first dev server start.
**Why it happens:** The seed script previously ran automatically on install, creating the database.
**How to avoid:** Add a clear error message in `getSqliteDb()` when the database file does not exist, instructing the user to run `npm run seed`. Also document in README or a startup check.
**Warning signs:** `SQLITE_CANTOPEN` error on first request after fresh clone.

### Pitfall 4: global-error.tsx Missing html/body Tags
**What goes wrong:** global-error.tsx renders without `<html>` and `<body>` tags, causing the page to render incorrectly or not at all when a root layout error occurs.
**Why it happens:** Unlike regular error.tsx, global-error.tsx replaces the entire root layout, so it must provide its own document structure.
**How to avoid:** Always include `<html lang="ko">` and `<body>` in global-error.tsx. Cannot use Tailwind classes that depend on globals.css (since it replaces layout which imports it).
**Warning signs:** Blank page or unstyled content when root layout errors in production.

### Pitfall 5: typescript in devDependencies Breaks Vercel Build
**What goes wrong:** Moving `typescript` to devDependencies causes Vercel builds to fail because Vercel only installs production dependencies by default.
**Why it happens:** Vercel runs `npm install --production` (or equivalent) then `next build`, which needs TypeScript at build time.
**How to avoid:** Keep `typescript` in `dependencies` for Vercel deployment. Only move truly dev-only packages: `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `eslint-config-next`. Vercel's build step runs `next build` which needs TypeScript.
**Warning signs:** Vercel deploy fails with "Cannot find module 'typescript'".

### Pitfall 6: ErrorBoundary Reset Does Not Re-fetch Data
**What goes wrong:** User clicks "retry" button in ChartErrorBoundary, component re-renders, but the same stale/broken data causes the same error again.
**Why it happens:** `this.setState({ hasError: false })` only clears the error state and re-renders children. It does not trigger a new data fetch (the parent hook's useEffect has already completed).
**How to avoid:** For chart-level boundaries, this is acceptable since chart render errors are usually from malformed data or Recharts bugs, not transient issues. The data hooks in parent components handle their own error states. Document this limitation in the component JSDoc.
**Warning signs:** Infinite retry loops where user clicks retry and immediately sees the error again.

## Code Examples

### Example 1: Complete getSqliteDb Singleton
```typescript
// Source: Adapted from Prisma globalThis pattern + existing getDb() in src/lib/db.ts
const globalForDb = globalThis as typeof globalThis & {
  _sqliteDb?: import('better-sqlite3').Database;
};

function getSqliteDb(): import('better-sqlite3').Database {
  if (!globalForDb._sqliteDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const dbPath = require('path').join(process.cwd(), 'data', 'dashboard.db');
    globalForDb._sqliteDb = new Database(dbPath);
    globalForDb._sqliteDb.pragma('journal_mode = WAL');
  }
  return globalForDb._sqliteDb;
}
```

### Example 2: Wrapping a Chart Component
```typescript
// In a page component or the chart file itself:
import ChartErrorBoundary from '@/components/ChartErrorBoundary';

// Wrap the chart JSX:
<ChartErrorBoundary chartName="IndicatorChart">
  <ResponsiveContainer width="100%" height={320}>
    <LineChart data={chartData}>
      {/* ... chart config ... */}
    </LineChart>
  </ResponsiveContainer>
</ChartErrorBoundary>
```

### Example 3: devDependencies Migration (package.json diff)
```jsonc
// MOVE from dependencies to devDependencies:
// "@types/node": "^25.2.3"        -- type definitions only
// "@types/react": "^19.2.14"      -- type definitions only
// "@types/react-dom": "^19.2.3"   -- type definitions only
// "eslint": "^9.39.2"             -- linting tool
// "eslint-config-next": "^16.1.6" -- linting config

// KEEP in dependencies (needed at build time on Vercel):
// "typescript": "^5.9.3"          -- Vercel needs this for `next build`
```

### Example 4: Mock File Move and Import Update
```typescript
// BEFORE (scripts/seed.ts):
import { SUPPLY_CHAIN_CATEGORIES } from '../src/data/supply-chain-mock';

// AFTER (scripts/seed.ts):
import { SUPPLY_CHAIN_CATEGORIES } from '../tests/fixtures/supply-chain-mock';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| error.tsx `reset` prop | error.tsx `unstable_retry` prop | Next.js 16.2.0 | This project is on 16.1.6 -- use `reset` |
| React class ErrorBoundary only | Still class-only for render errors | React 19 (Dec 2024) | No change; React 19 improved error logging but class components still required |
| Per-request DB connections | Singleton with globalThis | Standard pattern since Next.js 13 | Prevents connection exhaustion |

**Deprecated/outdated:**
- `unstable_retry` in error.tsx: Not available in Next.js 16.1.x. Upgrade to 16.2+ to use it. For now, use `reset`.

## Open Questions

1. **Mock files destination directory name**
   - What we know: Files move out of `src/data/` to avoid production bundle inclusion. Scripts import them.
   - What's unclear: Best directory name -- `tests/fixtures/`, `test-data/`, `fixtures/`, or keep in `data/mock/`?
   - Recommendation: Use `tests/fixtures/` to align with the existing `src/lib/__tests__/` pattern and make clear these are test/seed-only data. The `@/` alias won't resolve here, so scripts use relative paths.

2. **Seed script data source abstraction (D-07)**
   - What we know: Phase 1 implements mock-based seed only, but must abstract for future API sources.
   - What's unclear: How much abstraction is needed -- full strategy pattern or simple conditional?
   - Recommendation: Keep it simple. Add a `SEED_SOURCE` environment variable check (`mock` | `api`) with a clear TODO comment for the API branch. Do not over-engineer the abstraction in Phase 1.

3. **global-error.tsx Tailwind styling**
   - What we know: global-error.tsx replaces root layout, which imports globals.css with Tailwind.
   - What's unclear: Whether Tailwind classes work in global-error.tsx since it provides its own html/body.
   - Recommendation: Use inline styles or minimal Tailwind classes in global-error.tsx. Test by triggering a root layout error in development. If Tailwind classes don't apply, fall back to inline styles.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUN-01 | SQLite singleton returns same instance | unit | `npx vitest run src/lib/__tests__/db.test.ts -t "singleton"` | No -- Wave 0 |
| FOUN-02 | error.tsx and global-error.tsx render correctly | manual | Trigger error in dev, visually verify | N/A (manual) |
| FOUN-03 | ChartErrorBoundary catches render errors | unit | `npx vitest run src/components/__tests__/ChartErrorBoundary.test.tsx -t "error"` | No -- Wave 0 |
| FOUN-04 | postinstall removed from package.json | smoke | `node -e "const p=require('./package.json');if(p.scripts.postinstall)process.exit(1)"` | No -- inline check |
| FOUN-05 | Mock files not importable from src/ | smoke | `npx vitest run` (build succeeds, no src/data/*-mock.ts) | No -- build check |
| FOUN-06 | @types/* in devDependencies | smoke | `node -e "const p=require('./package.json');if(p.dependencies['@types/node'])process.exit(1)"` | No -- inline check |

### Sampling Rate
- **Per task commit:** `npm run build` (mandatory per CLAUDE.md)
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` + `npm run seed` success

### Wave 0 Gaps
- [ ] `src/lib/__tests__/db.test.ts` -- covers FOUN-01 singleton behavior
- [ ] `src/components/__tests__/ChartErrorBoundary.test.tsx` -- covers FOUN-03 error catching

## Sources

### Primary (HIGH confidence)
- [Next.js error.js API Reference v16.2.1](https://nextjs.org/docs/app/api-reference/file-conventions/error) - error.tsx props, global-error.tsx requirements, version history confirming `unstable_retry` added in 16.2.0
- [React Error Boundaries docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) - Class component requirement confirmed for React 19
- Codebase inspection: `src/lib/db.ts` (lines 40-49, 75-81, 120-137) -- current connection pattern and existing singleton reference

### Secondary (MEDIUM confidence)
- [Next.js Discussion #26427](https://github.com/vercel/next.js/discussions/26427) - globalThis pattern for database connections surviving HMR
- [Prisma Next.js singleton guide](https://www.robinwieruch.de/next-prisma-sqlite/) - globalThis caching pattern adapted for better-sqlite3
- [react-error-boundary npm](https://www.npmjs.com/package/react-error-boundary) - v6.1.1 confirmed React 19 compatible

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed; all patterns use existing installed packages
- Architecture: HIGH - Patterns are well-documented Next.js/React conventions with official docs
- Pitfalls: HIGH - Verified against actual codebase (import paths, version numbers, Vercel behavior)

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable patterns, no fast-moving dependencies)
