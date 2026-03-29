# Architecture Patterns

**Domain:** Next.js 16.1 dashboard refactoring — god component decomposition, shared hooks, DB connection management, error boundaries, API middleware
**Researched:** 2026-03-29
**Overall confidence:** HIGH (official Next.js 16.1 docs verified; patterns confirmed against actual source)

---

## 1. Component Decomposition Strategy

### The Problem (Concrete)

Five god components mix data transformation, state management, AI integration, and rendering in a single file:

| File | Lines | Responsibilities mixed |
|------|-------|----------------------|
| `ExternalComparison.tsx` | 1254 | Data transform + AI fetch + chart config + table render + filter UI |
| `MonthlyMetricsChart.tsx` | 799 | Data transform + AI fetch + chart config + rendering |
| `DemandBarChart.tsx` | 718 | Data transform + AI fetch + chart config + rendering |
| `VcmPage.tsx` | 678 | Layout + data coordination + sub-component orchestration |
| `IndicatorChart.tsx` | 555 | Data transform + AI fetch + chart config + correlation math + rendering |

### Decomposition Model: Three-Layer Split

For each god component, apply a consistent three-layer extraction:

```
[God Component]
    → [Data/Logic Hook]   (useState, useEffect, data transforms, derived values)
    → [Sub-components]    (isolated render units with no internal state)
    → [Thin Container]    (wires hook output to sub-components, <200 lines)
```

**Layer 1 — Logic Hook** (`useXxxData` or `useXxxState`)
Extract all non-render logic: state declarations, derived calculations, event handlers, and data transformations. The hook returns a typed object; the component only receives and renders.

```typescript
// Before: all in component
const [timeRange, setTimeRange] = useState<TimeRange>(12);
const allIndicators = (allCategories ?? [category]).flatMap((c) => c.indicators);
const xAxisInterval = Math.max(0, Math.floor(timeRange / 12) - 1);

// After: hook owns logic
export function useIndicatorChartState(category, allCategories, selectedIndicatorIds) {
  const [timeRange, setTimeRange] = useState<TimeRange>(12);
  const allIndicators = useMemo(
    () => (allCategories ?? [category]).flatMap((c) => c.indicators),
    [allCategories, category]
  );
  const xAxisInterval = Math.max(0, Math.floor(timeRange / 12) - 1);
  return { timeRange, setTimeRange, allIndicators, xAxisInterval };
}
```

**Layer 2 — Sub-components** (pure render, props-only)
Identify independently renderable regions. Ideal candidates: the AI insight panel (identical across all three AI-using components), chart header controls, correlation badge sections.

```typescript
// AiInsightPanel.tsx — reusable across IndicatorChart, ExternalComparison, DemandBarChart
interface AiInsightPanelProps {
  isOpen: boolean;
  isLoading: boolean;
  insight: string | null;
  onClose: () => void;
}
export function AiInsightPanel({ isOpen, isLoading, insight, onClose }: AiInsightPanelProps) { ... }
```

**Layer 3 — Thin Container** (wires hook → sub-components)
The original component file becomes an orchestrator under 200 lines.

### Extraction Order (Safe, Low-Regression)

1. Extract `useAiInsight` hook first (highest leverage — removes duplication from 3 files simultaneously)
2. Extract `AiInsightPanel` render component (depends on hook being stable)
3. Split each god component's logic hook (one component at a time)
4. Extract sub-components bottom-up (leaf nodes before parents)
5. Thin the container last (after all pieces verified independently)

**Never extract rendering and logic simultaneously in a single PR.** Always extract one layer, verify `npm run build` passes, then extract the next.

### Concrete Split Plan per Component

**`IndicatorChart.tsx` (555 lines → ~150 lines + 3 files):**
- `useIndicatorChartState.ts` — timeRange, darkMode refs, axis calculations
- `useAiInsight.ts` (shared) — AI fetch, loading, open/close, auto-refetch
- `AiInsightPanel.tsx` (shared) — render only
- `IndicatorChart.tsx` — thin container

**`DemandBarChart.tsx` (718 lines → ~180 lines + 2 files):**
- `useDemandBarChartState.ts` — filter state, YoY toggle, mount data grouping
- Consumes shared `useAiInsight.ts` and `AiInsightPanel.tsx`
- `DemandBarChart.tsx` — thin container

**`ExternalComparison.tsx` (1254 lines → ~200 lines + 4 files):**
- `useExternalComparisonState.ts` — visibleMetrics, wafer data transforms, quarter boundary calc
- `WaferInOutChart.tsx` — chart render only
- `MonthlyMetricsTable.tsx` — table render only
- Consumes shared `useAiInsight.ts` and `AiInsightPanel.tsx`
- `ExternalComparison.tsx` — thin container

---

## 2. Shared Hook Extraction: `useAiInsight`

### The Problem (Concrete)

Three components implement nearly identical AI insight fetching. Differences are only in how they build the `context` string and the `tab` identifier:

| Component | Tab string | Context builder |
|-----------|-----------|-----------------|
| `IndicatorChart` | `'supply-chain'` | Indicator monthly data + correlations |
| `ExternalComparison` | `'customer-wafer'` | Wafer in/out sections + monthly metrics |
| `DemandBarChart` | `'vcm-app'` | Bar data lines + mount data |

All three share: `useState(aiInsight/aiLoading/aiOpen)`, `useRef(aiLoadingRef)`, toggle-on-click behavior, auto-refetch when tracked dependencies change, and an `eslint-disable-line` suppression masking a stale closure bug.

### Recommended Hook Signature

```typescript
// src/hooks/useAiInsight.ts

interface UseAiInsightOptions {
  tab: string;
  buildContext: () => string | null;  // returns null to skip fetch
  watchKeys: string[];                // auto-refetch when any key changes
}

interface UseAiInsightResult {
  insight: string | null;
  isLoading: boolean;
  isOpen: boolean;
  fetch: (force?: boolean) => void;
  close: () => void;
}

export function useAiInsight(options: UseAiInsightOptions): UseAiInsightResult;
```

**Key design decisions:**

1. `buildContext` is a callback (not a value) so the hook does not need the raw data in its dependency array — the component passes a stable memoized function via `useCallback`. This eliminates the stale closure that caused the original `eslint-disable-line` suppressions.

2. `watchKeys` is a string array that acts as the auto-refetch trigger. Each component passes its own stable key (e.g., `[selectedIndicatorIds.join(','), overlayKey]`). The hook compares against a ref to detect changes.

3. The toggle behavior (click when open → close; click when closed → fetch or reopen cached) lives entirely in the hook's `fetch()` function.

### Fixing the Stale Closure (React 19 Compatible)

The existing `eslint-disable-line react-hooks/exhaustive-deps` suppressions hide a real bug: `fetchAiInsight` captures stale props because it is defined inside the component without `useCallback`. The fix:

```typescript
// Inside useAiInsight hook — buildContext wrapped by caller with useCallback
const buildContextRef = useRef(buildContext);
useEffect(() => { buildContextRef.current = buildContext; });  // always current

const fetch = useCallback(async (force = false) => {
  const context = buildContextRef.current();  // always reads latest
  if (!context) return;
  // ... fetch logic
}, [tab]);  // only tab is a true dependency
```

This pattern (ref + always-sync effect) is the established pre-`useEffectEvent` approach. React 19 ships `useEffectEvent` as stable in 19.2 but the project uses React 19.2.4 — confirm availability before adopting it. The ref approach works on all React 19.x versions.

---

## 3. SQLite Singleton Connection Pattern

### The Problem (Concrete)

`getSqliteDb()` in `src/lib/db.ts` (line 42) creates a new `better-sqlite3` connection on every call. Each API request that calls multiple query functions (e.g., `/api/supply-chain` calls 7 separate DB queries) opens 7 connections, none of which are closed. Only `queryAll()` calls `db.close()`, and that inconsistency is unintentional.

### Fix: Module-Level Singleton

```typescript
// src/lib/db.ts — replace getSqliteDb() with this

let _queryDb: import('better-sqlite3').Database | null = null;

function getQueryDb(): import('better-sqlite3').Database {
  if (!_queryDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    const dbPath = require('path').join(process.cwd(), 'data', 'dashboard.db');
    _queryDb = new Database(dbPath);
    _queryDb.pragma('journal_mode = WAL');  // already set; confirm idempotent
  }
  return _queryDb;
}
```

Replace every `getSqliteDb()` call in the five query functions with `getQueryDb()`. Remove the `db.close()` call from `queryAll()` — closing a singleton would break subsequent requests.

**Why this works on serverless (Vercel):** Each serverless function instance is a single Node.js process. The module-level `_queryDb` singleton persists for the lifetime of that process (warm invocations). Cold starts get a fresh instance. `better-sqlite3`'s synchronous API does not have connection pool concerns — a single connection handles all queries sequentially within one request. The WAL journal mode (`journal_mode = WAL`) already set in `ensureSchema` allows concurrent readers, which covers warm-invocation scenarios.

**Separate singletons for query vs. seed:** Keep `_seedDb` (used by `scripts/seed.ts`) and `_queryDb` as separate module-level variables. Seed scripts need schema enforcement (`ensureSchema`); query code does not.

**Do not share `_queryDb` with `_seedDb`.** The `getDb()` export (used by seed scripts) calls `ensureSchema` which runs DDL. DDL on every API request is unnecessary overhead.

---

## 4. Error Boundary Placement Strategy

### Next.js 16.1 Conventions (Verified Against Official Docs)

Next.js 16.1 uses `error.tsx` file convention. Key rules:
- `error.tsx` must be a `'use client'` component
- It wraps the `page.tsx` and nested layouts in the same segment, but NOT the `layout.tsx` of the same segment
- `global-error.tsx` at `src/app/global-error.tsx` wraps the root layout
- Errors bubble up to the nearest parent boundary
- The `unstable_catchError` API from `next/error` allows component-level wrapping without route segments (useful for individual chart components)

### Placement Map for This Project

```
src/app/
├── global-error.tsx          ← catches root layout errors; must include <html><body>
├── error.tsx                 ← catches page.tsx errors (V3Container, tab switching)
└── [no sub-routes needed — single page app]

src/components/
├── V3Container.tsx
│   ├── <ErrorBoundary>       ← wraps SupplyChainPage
│   ├── <ErrorBoundary>       ← wraps VcmPage
│   └── <ErrorBoundary>       ← wraps CustomerDetailPage
```

Because this is a single-route app (`/`), file-based `error.tsx` at the route level catches errors from the page itself but not from individual chart components. Chart rendering errors (Recharts null data crash, bad API response) need component-level boundaries.

**Recommended approach:** Use `unstable_catchError` from `next/error` to create a reusable `<ChartErrorBoundary>` component:

```typescript
// src/components/shared/ChartErrorBoundary.tsx
'use client';
import { unstable_catchError as catchError, type ErrorInfo } from 'next/error';

function ChartErrorFallback(
  props: { chartName: string },
  { error, unstable_retry }: ErrorInfo,
) {
  return (
    <div className="flex h-[540px] items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
      <div className="text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{props.chartName} 렌더링 오류</p>
        <button onClick={() => unstable_retry()} className="mt-2 text-xs text-gray-500 underline">
          다시 시도
        </button>
      </div>
    </div>
  );
}

export default catchError(ChartErrorFallback);
```

Wrap each major chart component at the call site in its page component:

```typescript
// SupplyChainPage.tsx
<ChartErrorBoundary chartName="지표 차트">
  <IndicatorChart ... />
</ChartErrorBoundary>
```

**Note:** Error boundaries do NOT catch errors in async event handlers (e.g., `fetchAiInsight` try/catch). Those are already caught by the existing try/catch blocks and set error state in the hook. Error boundaries are for rendering-time crashes only.

### Tab-Level Boundaries in V3Container

Wrap each tab page with a class-based error boundary or use the `unstable_catchError` approach. This ensures one tab crashing does not collapse the entire dashboard:

```typescript
// V3Container.tsx (simplified)
<TabErrorBoundary tabName="Supply Chain">
  <SupplyChainPage ... />
</TabErrorBoundary>
```

---

## 5. Middleware/Proxy Pattern for Auth and Rate Limiting

### Critical Finding: `middleware.ts` Deprecated in Next.js 16.0

**Next.js 16.1 has renamed `middleware.ts` to `proxy.ts`.** The exported function must be named `proxy` (not `middleware`). The file signature is otherwise identical. A codemod exists: `npx @next/codemod@canary middleware-to-proxy .`

This project does not yet have a middleware/proxy file, so there is no migration needed — create `src/proxy.ts` directly.

### Auth Pattern: Static Bearer Token for Internal Dashboard

This is an internal tool. Full OAuth/session auth is out of scope. The correct approach is a static `DASHBOARD_SECRET` environment variable checked in proxy:

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET;

export function proxy(request: NextRequest) {
  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip auth check if no secret configured (local dev without env var)
  if (!DASHBOARD_SECRET) {
    return NextResponse.next();
  }

  const token = request.headers.get('x-dashboard-secret')
    ?? request.nextUrl.searchParams.get('secret');

  if (token !== DASHBOARD_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

The client-side hooks must forward this token. Add it as a request header in each `fetch()` call, sourced from `process.env.NEXT_PUBLIC_DASHBOARD_SECRET`.

### Rate Limiting: In-Route for AI Endpoints (No Redis Required)

For this project's scale (internal dashboard, not public), a per-process in-memory token bucket is sufficient and avoids adding Upstash Redis as a dependency. The file cache is already effectively an implicit rate limiter for identical requests (24h TTL). The real risk is varied context strings bypassing the cache.

Add rate limiting directly in the three expensive API routes (`ai-insight`, `transcript`, `news`) using a simple in-memory map:

```typescript
// src/lib/rate-limit.ts
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;  // allowed
  }

  if (entry.count >= limit) return false;  // blocked
  entry.count++;
  return true;  // allowed
}
```

Usage in `src/app/api/ai-insight/route.ts`:

```typescript
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`ai-insight:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  // ... existing logic
}
```

**Why not Upstash Redis?** The project already uses Vercel Postgres for persistent state. Adding Upstash Redis for rate limiting introduces a second external dependency. For an internal dashboard with a small user base, in-memory rate limiting per serverless instance is adequate. If the dashboard becomes public-facing, migrate to `@upstash/ratelimit` + Vercel KV at that point.

**Why not proxy-level rate limiting?** Proxy (formerly middleware) runs at the Edge runtime, which cannot share in-memory state with serverless function instances. Per-route rate limiting in Node.js serverless functions is the correct layer for this pattern.

---

## 6. Component Boundaries and Data Flow

### Current Flow (All Tabs)

```
Browser → page.tsx → V3Container (tab state)
                          ↓ (activeTab)
              SupplyChainPage / VcmPage / CustomerDetailPage
                          ↓ (useXxxData hook)
              fetch('/api/xxx')
                          ↓
              API Route Handler (queryMetrics → db.ts → SQLite/Postgres)
                          ↓ (JSON response)
              Hook sets state → component re-renders
```

### Post-Refactor Flow (unchanged externally, cleaner internally)

```
Browser → page.tsx → V3Container (tab state)
                          ↓
              <TabErrorBoundary>
                <SupplyChainPage>            ← thin container, <200 lines
                  useSupplyChainData()       ← unchanged
                  useIndicatorChartState()   ← extracted from IndicatorChart
                  useAiInsight(...)          ← shared hook
                  <ChartErrorBoundary>
                    <IndicatorChart />       ← render only
                  </ChartErrorBoundary>
                  <AiInsightPanel />         ← shared render component
                </SupplyChainPage>
              </TabErrorBoundary>
```

Data flow direction is unchanged. No new network calls. No state lifted unnecessarily. The refactoring is purely a vertical slice within the component files.

### Component Boundary Rules

| Boundary | Rule |
|----------|------|
| Hook ↔ Component | Hook owns all state and side effects; component owns zero state |
| Container ↔ Sub-component | Sub-components are stateless; all data comes via props |
| Shared component | Must accept no context-specific logic; parameterized via props only |
| API Route ↔ Client | Contract unchanged — same JSON shape in/out |
| DB Layer ↔ API Route | `db.ts` exports only async functions returning `MetricRow[]` |

---

## 7. Build Order (Dependency Graph)

The following order minimizes regression risk. Each step must pass `npm run build` before proceeding.

```
Step 1: DB singleton fix (CC-1)
   └─ No interface change. Purely internal to db.ts.
   └─ All API routes continue to work without modification.

Step 2: Error boundaries
   └─ Additive only. Wrap existing components without touching internals.
   └─ Add src/app/error.tsx, src/app/global-error.tsx, ChartErrorBoundary.tsx.

Step 3: Extract useAiInsight hook
   └─ Create src/hooks/useAiInsight.ts.
   └─ Replace AI logic in IndicatorChart.tsx first (smallest, 555 lines).
   └─ Verify build. Then replace ExternalComparison.tsx.
   └─ Verify build. Then replace DemandBarChart.tsx.
   └─ Only then delete the duplicated code from all three.

Step 4: Extract AiInsightPanel render component
   └─ Depends on Step 3 (hook API must be stable before extracting render).
   └─ Create src/components/shared/AiInsightPanel.tsx.
   └─ Replace inline render blocks in all three components.

Step 5: Split remaining god components (one at a time)
   └─ IndicatorChart: extract useIndicatorChartState.ts
   └─ DemandBarChart: extract useDemandBarChartState.ts
   └─ ExternalComparison: extract useExternalComparisonState.ts + sub-components
   └─ MonthlyMetricsChart: extract hook + sub-components
   └─ VcmPage: extract any remaining orchestration logic

Step 6: Rate limiting (CC-3)
   └─ Create src/lib/rate-limit.ts.
   └─ Add checkRateLimit() to ai-insight, transcript, news route handlers.

Step 7: Auth proxy (CC-2)
   └─ Create src/proxy.ts (not middleware.ts — Next.js 16.1 convention).
   └─ Add DASHBOARD_SECRET env var to Vercel dashboard.
   └─ Update client hooks to forward x-dashboard-secret header.
   └─ Test: verify unauthenticated requests return 401.
```

**Steps 1-2 are blockers for everything else** — they fix crashes and add safety nets before structural changes.
**Step 3 is the highest-leverage refactor** — one hook eliminates ~300 lines of duplicated logic across 3 files.
**Steps 5-7 are independent** — can be done in any order after Step 4.

---

## 8. Anti-Patterns to Avoid

### Anti-Pattern 1: Lifting State to V3Container
**What:** Moving all page state into V3Container to share between tabs.
**Why bad:** Tabs are independent by design. Shared state in V3Container causes all three pages to re-render on any state change, and creates prop drilling chains.
**Instead:** Keep state local to each page. Use shared hooks for shared behavior.

### Anti-Pattern 2: Converting to Server Components
**What:** Refactoring page components to Server Components for data fetching.
**Why bad:** Out of scope for this refactoring milestone. Would require removing `'use client'` from every page and restructuring data fetching. High regression risk.
**Instead:** Keep all components as client components. Data fetching stays in custom hooks calling API routes.

### Anti-Pattern 3: Extracting Every Sub-Section Into a File
**What:** Creating a new file for every 50-line render block in a god component.
**Why bad:** Over-fragmentation creates navigational overhead without proportional benefit. A 20-file component tree for a single chart is harder to understand than a well-structured 200-line file.
**Instead:** Extract only when a unit (a) has a distinct responsibility, (b) is reused in more than one place, or (c) has independent state that can be isolated.

### Anti-Pattern 4: Closing the Singleton DB Connection
**What:** Calling `_queryDb.close()` anywhere in API route code after adopting the singleton.
**Why bad:** The next request in the same warm instance will fail with "database is closed."
**Instead:** Never close `_queryDb`. Closing happens automatically when the process exits.

### Anti-Pattern 5: Using `middleware.ts` in Next.js 16.1
**What:** Creating `src/middleware.ts` with `export function middleware()`.
**Why bad:** `middleware` is deprecated as of Next.js 16.0. The file convention is `proxy.ts` with `export function proxy()`.
**Instead:** Create `src/proxy.ts` directly. No migration codemod needed since no existing middleware file exists.

---

## Sources

- Next.js 16.1 Error Handling official docs: https://nextjs.org/docs/app/getting-started/error-handling (verified 2026-03-25)
- Next.js 16.1 Proxy (formerly Middleware) official docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy (verified 2026-03-25)
- better-sqlite3 npm: https://www.npmjs.com/package/better-sqlite3 (singleton pattern, WAL mode)
- Upstash rate limiting pattern: https://upstash.com/blog/nextjs-ratelimiting (verified, Upstash/ratelimit approach)
- React stale closure patterns: https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures (MEDIUM confidence — community source)
- React component decomposition: https://martinfowler.com/articles/modularizing-react-apps.html (MEDIUM confidence — Martin Fowler, well-regarded)
- Actual source files read: `src/lib/db.ts`, `src/components/supply-chain/IndicatorChart.tsx` (lines 82–165), `src/components/customer-detail/ExternalComparison.tsx` (lines 495–600), `src/components/vcm/DemandBarChart.tsx` (lines 180–255), `src/app/api/ai-insight/route.ts`, `src/app/layout.tsx`, `package.json`

---

*Architecture research: 2026-03-29*
