# Phase 2: Core Quality - Research

**Researched:** 2026-03-29
**Domain:** React hooks extraction, API input validation (Zod v4), Next.js 16 proxy (auth/rate-limiting), error logging
**Confidence:** HIGH

## Summary

Phase 2 addresses four distinct domains: (1) extracting duplicated AI insight fetching logic into a shared `useAiInsight` hook and `AiInsightPanel` component, (2) adding Zod v4 input validation to 3 API endpoints, (3) adding Basic Auth and in-memory rate limiting via Next.js 16's `proxy.ts` convention, and (4) replacing all silent catch blocks with structured `console.error` logging.

A critical finding is that Next.js 16 has **renamed `middleware.ts` to `proxy.ts`**. The CONTEXT.md decision D-06 references `src/middleware.ts`, but the correct file for Next.js 16.1.6 (currently installed) is `src/proxy.ts`. The export function must be named `proxy`, not `middleware`. This is confirmed by official Next.js documentation.

Zod v4.3.6 is already present as a transitive dependency (via `@anthropic-ai/sdk` and `eslint-plugin-react-hooks`), so adding it as a direct dependency introduces zero new packages to `node_modules`. The Zod v4 API differs from v3 -- notably, error customization uses `error` instead of `message` parameter.

**Primary recommendation:** Implement in order: (1) error logging fixes first (lowest risk, no behavior change), (2) useAiInsight hook extraction, (3) Zod validation, (4) proxy.ts for auth/rate-limiting last (new file, most integration risk).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fetch/State만 추출 -- 훅은 aiInsight/aiLoading/aiOpen state + fetchAiInsight() + deps 기반 auto-refetch를 담당. context 빌드 로직은 각 컴포넌트에 남긴다. 훅 인터페이스: `useAiInsight(tab, buildContext, deps)`
- **D-02:** deps 기반 auto-refetch 포함 -- 훅이 deps 배열을 받아 변경 시 자동 refetch. 이를 통해 eslint-disable react-hooks/exhaustive-deps 억제 3개 제거 가능.
- **D-03:** AiInsightPanel UI 컴포넌트도 함께 추출 -- useAiInsight 훅 + AiInsightPanel 컴포넌트를 한 세트로 추출. 컴포넌트는 `<AiInsightPanel {...aiProps} />`만 렌더링하면 됨.
- **D-04:** Basic Auth 방식 -- 환경변수로 아이디/비밀번호 설정. 내부 도구에 적합하고 구현 단순. Vercel 대시보드에서 환경변수만 설정하면 동작.
- **D-05:** Rate Limiting은 비용 발생 API만 -- /api/ai-insight, /api/transcript, /api/news 3개만 적용. 데이터 조회 API는 DB만 접근하므로 불필요.
- **D-06:** Next.js middleware에 통합 구현 -- src/middleware.ts에 Basic Auth + Rate Limiting 통합. matcher로 대상 선별. 각 라우트에 개별 코드 추가하지 않음. **NOTE: Next.js 16.1 requires `src/proxy.ts` (not middleware.ts). Planner must use `proxy.ts`.**
- **D-07:** QUAL-03 명시 엔드포인트만 -- /api/ai-insight(POST body), /api/transcript(query params), /api/news(query params) 3개만 적용.
- **D-08:** 타입 + 길이 제한 수준 -- tab: string max(50), context: string max(10000) 등 타입 검사와 문자열 길이 제한 추가.
- **D-09:** 모든 silent catch에 console.error 추가 -- cache.ts(5곳), API 라우트(6곳+), db.ts(4곳) 전수 적용.
- **D-10:** 기존 패턴 유지 -- console.error('[tag] description:', err) 형식. 새로운 로깅 라이브러리 도입 없이 일관성만 확보.

### Claude's Discretion
- useAiInsight 훅의 구체적 내부 구현 (useRef 관리, AbortController 등)
- AiInsightPanel 컴포넌트의 구체적 Props 인터페이스 설계
- Rate Limiting 토큰 버킷의 구체적 수치 (요청 수/시간 등)
- Basic Auth 환경변수 네이밍 (e.g. DASHBOARD_USER, DASHBOARD_PASS)
- Zod 스키마의 각 필드별 구체적 제약조건
- SupplyChainPage.tsx의 4번째 eslint-disable 처리 방식 (useAiInsight 추출과 무관한 곳)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | useAiInsight 공통 훅 추출 | 3개 컴포넌트의 중복 패턴 분석 완료. useRef + useState + useEffect 패턴 동일. context 빌드만 다름. `useAiInsight(tab, buildContext, deps)` 인터페이스로 통합 가능. |
| QUAL-02 | AiInsightPanel 공통 컴포넌트 추출 | 3곳의 AI insight UI (버튼 + 패널) 유사 패턴 확인. Props: insight, loading, open, onToggle, disabled. |
| QUAL-03 | API 라우트 Zod v4 입력 검증 추가 | Zod v4.3.6 이미 transitive dependency. /api/ai-insight(POST body), /api/transcript(query params), /api/news(query params) 3개 대상. |
| QUAL-04 | 빈 catch 블록 에러 로깅 강화 | 전수 조사 완료: cache.ts 5곳, supply-chain/route.ts 4곳, transcript/route.ts 6곳, customer-detail/route.ts 2곳, IndicatorChart 1곳, ExternalComparison 1곳, DemandBarChart 1곳, db.ts 1곳 (getSqliteDb). 총 21곳. db.ts의 4개 console.warn은 console.error로 승격. |
| QUAL-05 | in-memory Rate Limiting 추가 | proxy.ts에서 Map 기반 토큰 버킷 구현. 비용 API 3개만 대상. |
| QUAL-06 | 기본 인증 미들웨어 추가 | Next.js 16.1은 proxy.ts 사용 (middleware.ts 아님). export function proxy(request) 시그니처. Basic Auth 환경변수 기반. |
| QUAL-07 | eslint-disable react-hooks/exhaustive-deps 제거 | 4개 위치 확인: IndicatorChart:166, DemandBarChart:252, ExternalComparison:527 (3개는 useAiInsight 추출로 제거), SupplyChainPage:52 (별도 처리 필요). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack**: Next.js 16.1 / React 19 / Recharts 3.7 / Tailwind 4.1 / TypeScript 5.9 -- no changes permitted
- **Build verification**: `npm run build` must pass with zero errors after every change
- **Debug limit**: 3 retries max per error
- **No new logging library** -- use existing `console.error('[tag] description:', err)` pattern
- **Korean comments** for domain logic
- **Import aliases**: `@/` for cross-directory imports, `./` for siblings only

## Standard Stack

### Core (New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.3.6 | API input validation schemas | Already transitive dep via @anthropic-ai/sdk. Zod v4 is 14.7x faster than v3. Zero bundle impact. |

### Supporting (Existing, No Changes)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/server | 16.1.6 | NextRequest, NextResponse for proxy.ts | Proxy function, request/response handling |
| react | 19.2.4 | useState, useEffect, useRef, useCallback for hook | useAiInsight implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | valibot | Zod already in dep tree; valibot would add new dep |
| In-memory rate limit | @upstash/ratelimit | Upstash requires Redis setup; overkill for internal tool (explicitly out of scope in REQUIREMENTS.md) |
| Basic Auth | Auth.js v5 | Full auth system overkill for internal dashboard with ~1-2 users |

**Installation:**
```bash
npm install zod@^4.3.6
```

**Version verification:** Zod 4.3.6 confirmed as latest via `npm view zod version` on 2026-03-29. Already available in node_modules as transitive dependency.

## Architecture Patterns

### New Files to Create
```
src/
├── proxy.ts                          # NEW: Basic Auth + Rate Limiting (Next.js 16 convention)
├── hooks/
│   └── useAiInsight.ts               # NEW: Shared AI insight fetching hook
├── components/
│   └── common/
│       └── AiInsightPanel.tsx         # NEW: Shared AI insight UI component
└── lib/
    └── api-schemas.ts                # NEW: Zod validation schemas for API routes
```

### Pattern 1: useAiInsight Hook
**What:** Extract duplicated AI insight state management into a single hook
**When to use:** Any component that needs to fetch and display AI insights
**Design:**
```typescript
// Source: Analyzed from IndicatorChart.tsx:85-166, ExternalComparison.tsx:509-601, DemandBarChart.tsx:175-252

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAiInsightOptions {
  tab: string;
  buildContext: () => string | null;  // Returns context string or null to skip
  deps: unknown[];                     // Deps that trigger auto-refetch when panel is open
}

interface UseAiInsightReturn {
  aiInsight: string | null;
  aiLoading: boolean;
  aiOpen: boolean;
  fetchAiInsight: (force?: boolean) => void;
  // Props bundle for AiInsightPanel
  aiProps: {
    insight: string | null;
    loading: boolean;
    open: boolean;
    onToggle: () => void;
  };
}

export function useAiInsight({ tab, buildContext, deps }: UseAiInsightOptions): UseAiInsightReturn {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiLoadingRef = useRef(false);
  const prevDepsRef = useRef<string>('');

  const fetchAiInsight = useCallback(async (force = false) => {
    if (!force) {
      if (aiInsight && !aiLoadingRef.current && !aiOpen) { setAiOpen(true); return; }
      if (aiOpen && aiInsight && !aiLoadingRef.current) { setAiOpen(false); return; }
    }
    if (aiLoadingRef.current) return;

    const context = buildContext();
    if (!context) return;

    setAiOpen(true);
    setAiLoading(true);
    aiLoadingRef.current = true;
    setAiInsight(null);
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, context }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.insight) setAiInsight(data.insight);
    } catch (err) {
      console.error(`[ai-insight] ${tab} fetch failed:`, err);
    } finally {
      setAiLoading(false);
      aiLoadingRef.current = false;
    }
  }, [tab, buildContext, aiInsight, aiOpen]);

  // Auto-refetch when deps change while panel is open
  useEffect(() => {
    const depsKey = JSON.stringify(deps);
    if (aiOpen && depsKey !== prevDepsRef.current && prevDepsRef.current !== '') {
      setAiInsight(null);
      fetchAiInsight(true);
    }
    prevDepsRef.current = depsKey;
  }, [deps, aiOpen, fetchAiInsight]);

  return {
    aiInsight,
    aiLoading,
    aiOpen,
    fetchAiInsight,
    aiProps: {
      insight: aiInsight,
      loading: aiLoading,
      open: aiOpen,
      onToggle: () => fetchAiInsight(),
    },
  };
}
```

**Key design decisions:**
- `buildContext` is a callback that each component provides -- keeps context-building logic in the component (D-01)
- `deps` array serialized to JSON string for comparison -- eliminates need for refs per dep (D-02)
- `aiProps` bundle simplifies passing to AiInsightPanel (D-03)
- `fetchAiInsight` included in useEffect deps array -- eliminates eslint-disable need (QUAL-07)
- Silent catch replaced with `console.error` (QUAL-04)

### Pattern 2: AiInsightPanel Component
**What:** Shared UI for AI insight display (button + collapsible panel)
**When to use:** Alongside useAiInsight hook in chart components
```typescript
// Source: Extracted from common UI pattern in IndicatorChart, ExternalComparison, DemandBarChart

'use client';

interface AiInsightPanelProps {
  insight: string | null;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export default function AiInsightPanel({
  insight, loading, open, onToggle, disabled, className,
}: AiInsightPanelProps) {
  // Button + collapsible insight display
  // Matches existing UI: indigo theme, loading spinner, markdown-like rendering
}
```

### Pattern 3: Next.js 16 Proxy with Basic Auth + Rate Limiting
**What:** `src/proxy.ts` that intercepts API requests for authentication and rate limiting
**When to use:** Automatically runs before matched API routes
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory token bucket for rate limiting
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 10;
const REFILL_INTERVAL_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) ?? { tokens: MAX_TOKENS, lastRefill: now };
  const elapsed = now - entry.lastRefill;
  const refills = Math.floor(elapsed / REFILL_INTERVAL_MS);
  if (refills > 0) {
    entry.tokens = Math.min(MAX_TOKENS, entry.tokens + refills);
    entry.lastRefill = now;
  }
  if (entry.tokens <= 0) return false;
  entry.tokens--;
  rateLimitMap.set(ip, entry);
  return true;
}

function checkBasicAuth(request: NextRequest): boolean {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASS;
  if (!user || !pass) return true; // Skip auth if not configured
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) return false;
  const decoded = atob(authHeader.slice(6));
  const [u, p] = decoded.split(':');
  return u === user && p === pass;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic Auth check for all API routes
  if (!checkBasicAuth(request)) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Dashboard"' },
    });
  }

  // Rate limiting for expensive API routes only
  const rateLimitedPaths = ['/api/ai-insight', '/api/transcript', '/api/news'];
  if (rateLimitedPaths.some((p) => pathname.startsWith(p))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Pattern 4: Zod v4 API Validation
**What:** Schema-based input validation for API endpoints
**When to use:** At the top of API route handlers, before business logic
```typescript
// Source: https://zod.dev/v4

import * as z from 'zod';

// /api/ai-insight POST body
export const aiInsightSchema = z.object({
  tab: z.string().max(50),
  context: z.string().max(10000),
});

// /api/transcript GET query params
export const transcriptSchema = z.object({
  customer: z.string().max(50),
});

// /api/news GET query params
export const newsSchema = z.object({
  queryKo: z.string().max(200),
  queryEn: z.string().max(200),
  companyName: z.string().max(100).optional(),
  context: z.string().max(200).optional(),
});

// Usage in route handler:
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = aiInsightSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: result.error.issues },
      { status: 400 },
    );
  }
  const { tab, context } = result.data;
  // ... rest of handler
}
```

### Anti-Patterns to Avoid
- **Do NOT use `middleware.ts`** -- Next.js 16.1 requires `proxy.ts`. The `middleware` convention is deprecated and will be removed.
- **Do NOT import `proxy` from `next/server`** -- despite what some blog posts claim, the official API still uses `NextRequest`/`NextResponse` from `next/server`. The function is just named `proxy` and exported from the file.
- **Do NOT use `z.string().message()`** for error customization in Zod v4 -- use `z.string().error()` instead (`message` is deprecated).
- **Do NOT put buildContext logic inside useAiInsight** -- per D-01, context building stays in each component.
- **Do NOT apply rate limiting to data-query APIs** (`/api/supply-chain`, `/api/vcm`, `/api/customer-detail`) -- per D-05, only cost-generating APIs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Manual type checks + if statements | Zod v4 safeParse | Handles edge cases (null, undefined, wrong type), generates typed output, standard error format |
| Rate limiting algorithm | Custom counter logic | Token bucket pattern (simple Map-based) | Well-understood algorithm, handles bursty traffic correctly, easy to tune |
| Basic Auth parsing | Manual string splitting | Standard `atob()` + header parsing | Edge cases in base64 decoding, malformed headers |
| Hook dependency tracking | Multiple useRef for prev values | Single JSON.stringify comparison | Cleaner, less error-prone, works for any number of deps |

**Key insight:** Zod v4 is the only external addition. Rate limiting and Basic Auth are simple enough to implement inline in proxy.ts without libraries. The decision to use in-memory rate limiting (not Upstash) is locked and appropriate for an internal tool.

## Common Pitfalls

### Pitfall 1: Using middleware.ts Instead of proxy.ts
**What goes wrong:** File is ignored or build shows deprecation warnings. Auth/rate-limiting silently not applied.
**Why it happens:** Most tutorials and blog posts still reference `middleware.ts`. Next.js 16 renamed it.
**How to avoid:** Use `src/proxy.ts` with `export function proxy(request: NextRequest)`. NOT `export function middleware()`.
**Warning signs:** No 401/429 responses when testing; deprecation warnings in console.

### Pitfall 2: useCallback Dependency Stale Closure in useAiInsight
**What goes wrong:** `fetchAiInsight` captures stale `aiInsight` or `aiOpen` state, causing toggle behavior to break.
**Why it happens:** fetchAiInsight references state variables. Without proper useCallback deps, closure captures old values.
**How to avoid:** Include `aiInsight` and `aiOpen` in useCallback dependency array. The toggle logic (`if (aiInsight && !aiOpen) setAiOpen(true)`) depends on current state.
**Warning signs:** Clicking AI button doesn't toggle panel; panel stays open when it should close.

### Pitfall 3: Zod v4 API Differences from v3
**What goes wrong:** Using `.message()` instead of `.error()` for error customization; using `.strict()` instead of `z.strictObject()`.
**Why it happens:** Most examples online still show Zod v3 syntax.
**How to avoid:** Use Zod v4 API: `z.object()` for normal objects, `.error()` for custom messages, `safeParse()` for validation.
**Warning signs:** Deprecation warnings from Zod; TypeScript errors on method calls.

### Pitfall 4: Rate Limit Map Memory Leak
**What goes wrong:** Map grows unboundedly as unique IPs accumulate.
**Why it happens:** No cleanup of stale entries in the in-memory Map.
**How to avoid:** Add periodic cleanup (e.g., in `checkRateLimit`, delete entries older than 10 minutes) or set a max map size.
**Warning signs:** Server memory growing over time in long-running process.

### Pitfall 5: SupplyChainPage.tsx 4th eslint-disable
**What goes wrong:** Assuming all 4 eslint-disable comments will be fixed by useAiInsight extraction. The 4th one in SupplyChainPage.tsx (line 52) is unrelated.
**Why it happens:** SupplyChainPage.tsx:52 disables exhaustive-deps for a `useEffect` that calls `updateOverlay` -- not AI insight related.
**How to avoid:** Handle separately. The fix is to add `updateOverlay` to the dependency array (it's already wrapped in useCallback with [data] deps) or use a ref-based pattern.
**Warning signs:** eslint-disable count doesn't drop to 0 after useAiInsight extraction.

### Pitfall 6: Basic Auth Breaking Browser Dashboard Access
**What goes wrong:** Adding Basic Auth to all `/api/*` routes causes the dashboard page itself to break, since the client-side hooks call these APIs via `fetch()` without auth headers.
**Why it happens:** Browser-initiated requests from the same origin don't automatically include Basic Auth credentials.
**How to avoid:** Two approaches: (1) Apply auth only to API routes, and let the browser prompt for credentials on first page load (browser caches Basic Auth per origin), or (2) Use a session cookie set after initial auth, or (3) Check if the request originates from the same origin and skip auth for same-origin requests. Recommended: option (1) -- apply auth to API routes with `matcher: '/api/:path*'`, which will trigger the browser's native Basic Auth dialog on the first API call.
**Warning signs:** Dashboard shows "Failed to fetch" errors after adding auth.

## Code Examples

### Silent Catch Block Inventory (QUAL-04)

Full inventory of catch blocks requiring error logging:

**cache.ts (5 blocks):**
```typescript
// Line 19: ensureCacheDir - catch { return false; }
// Line 39: getCached file read - catch { /* File cache miss */ }
// Line 65: setCache file write - catch { /* File write failed */ }
// Line 76: clearCache single key - catch { /* ignore */ }
// Line 86: clearCache all - catch { /* ignore */ }
```

**supply-chain/route.ts (4 blocks):**
```typescript
// Line 92: JSON.parse metadata - catch { }
// Line 179: JSON.parse color metadata - catch { /* ignore */ }
// Line 198: JSON.parse foundry node metadata - catch { /* ignore */ }
// Line 249: JSON.parse server indicator metadata - catch { /* ignore */ }
```

**transcript/route.ts (6 blocks):**
```typescript
// Line 69: searchTavily preferred - catch { return []; }
// Line 93: searchTavilyGeneral - catch { return []; }
// Line 146: summarizeWithClaude - catch { return fallback; }
// Line 192: DB cache read - catch { /* DB not available */ }
// Line 273: SQLite write - catch { /* SQLite write failed */ }
// Line 286: Postgres write - catch { /* Postgres write failed */ }
```

**customer-detail/route.ts (2 blocks):**
```typescript
// Line 31: JSON.parse metadata - catch { /* ignore */ }
// Line 39: outer catch - catch { }
```

**Component catch blocks (3 blocks):**
```typescript
// IndicatorChart.tsx:150 - catch { /* ignore */ }
// ExternalComparison.tsx:599 - catch { /* ignore */ }
// DemandBarChart.tsx:240 - catch { /* ignore */ }
```

**db.ts (1 empty + 4 warn->error):**
```typescript
// Line 25: getSqliteDb catch { } - empty, should log
// Lines 138, 159, 183, 212: console.warn -> upgrade to console.error
```

**Total: 21 silent/weak catch blocks + 4 warn-to-error upgrades = 25 locations.**

### eslint-disable Locations (QUAL-07)

```
1. src/components/supply-chain/IndicatorChart.tsx:166
   -> Removed when useAiInsight hook extracts the useEffect

2. src/components/vcm/DemandBarChart.tsx:252
   -> Removed when useAiInsight hook extracts the useEffect

3. src/components/customer-detail/ExternalComparison.tsx:527
   -> Removed when useAiInsight hook extracts the useEffect

4. src/components/supply-chain/SupplyChainPage.tsx:52
   -> useEffect calls updateOverlay([data]) on mount
   -> Fix: updateOverlay is already useCallback([data])
   -> Add updateOverlay to deps array (stable reference when data doesn't change)
```

### Existing Hook Pattern (Convention Reference)

```typescript
// Source: src/hooks/useNews.ts -- demonstrates project conventions for hooks
'use client';

import { useState, useEffect } from 'react';

export function useHookName(params: ParamType) {
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // fetch logic with AbortController
    const controller = new AbortController();
    // ...
    return () => controller.abort();
  }, [/* all deps listed */]);

  return { data, loading, error };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` | Next.js 16.0 (2025) | File must be renamed; export function renamed to `proxy` |
| `export function middleware()` | `export function proxy()` | Next.js 16.0 | Named export change required |
| Zod v3 `.message()` | Zod v4 `.error()` | Zod 4.0.0 (2025) | Error customization API changed |
| Zod v3 `.strict()` | Zod v4 `z.strictObject()` | Zod 4.0.0 | Object strictness API moved to top-level |
| Edge Runtime in middleware | Node.js Runtime in proxy | Next.js 16.0 | proxy.ts runs on Node.js only; edge not supported |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16. Still works but will be removed. Use `proxy.ts`.
- `Zod v3 .message()`: Deprecated but still functional in v4. Use `.error()`.
- `skipMiddlewareUrlNormalize`: Renamed to `skipProxyUrlNormalize`.

## Open Questions

1. **Basic Auth and Browser Same-Origin Requests**
   - What we know: Browser will show native Basic Auth dialog for API calls. Credentials are cached per origin.
   - What's unclear: Whether this UX is acceptable (browser auth dialog) or if a cookie-based session is preferred.
   - Recommendation: Start with pure Basic Auth (D-04 locked decision). Browser dialog UX is acceptable for internal tool. If user finds it unacceptable, cookie session can be layered on later.

2. **Rate Limit Numbers**
   - What we know: D-05 says cost APIs only. Claude's discretion on exact numbers.
   - Recommendation: 10 requests per minute per IP for ai-insight, 20 per minute for transcript/news. These are generous for normal dashboard use but prevent automated abuse.

3. **SupplyChainPage.tsx eslint-disable Fix**
   - What we know: Line 52 calls `updateOverlay(['SEC'], 'capa')` in useEffect with `[data]` dep. `updateOverlay` is a useCallback with `[data]` dep.
   - Recommendation: Add `updateOverlay` to deps array. Since both depend on `data`, the effect only re-runs when `data` changes, which is correct behavior. No infinite loop risk.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | useAiInsight hook returns correct state and triggers fetch | unit (mock fetch) | `npx vitest run src/hooks/__tests__/useAiInsight.test.ts -t "useAiInsight"` | Wave 0 |
| QUAL-02 | AiInsightPanel renders insight text and toggle behavior | unit (render) | `npx vitest run src/components/common/__tests__/AiInsightPanel.test.tsx` | Wave 0 |
| QUAL-03 | Zod schemas reject invalid input, accept valid input | unit | `npx vitest run src/lib/__tests__/api-schemas.test.ts` | Wave 0 |
| QUAL-04 | Error logging present in previously-silent catches | manual inspection | `grep -r "catch {" src/ \| grep -v console` (should return 0) | manual-only |
| QUAL-05 | Rate limiter returns 429 after token exhaustion | unit | `npx vitest run src/__tests__/proxy.test.ts -t "rate limit"` | Wave 0 |
| QUAL-06 | Proxy rejects unauthenticated requests with 401 | unit | `npx vitest run src/__tests__/proxy.test.ts -t "basic auth"` | Wave 0 |
| QUAL-07 | Zero eslint-disable react-hooks/exhaustive-deps in codebase | smoke | `grep -r "eslint-disable.*exhaustive-deps" src/ \| wc -l` (should be 0) | manual-only |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` zero errors before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/hooks/__tests__/useAiInsight.test.ts` -- covers QUAL-01
- [ ] `src/components/common/__tests__/AiInsightPanel.test.tsx` -- covers QUAL-02
- [ ] `src/lib/__tests__/api-schemas.test.ts` -- covers QUAL-03
- [ ] `src/__tests__/proxy.test.ts` -- covers QUAL-05, QUAL-06
- [ ] Testing utilities: may need `@testing-library/react` for component tests

## Sources

### Primary (HIGH confidence)
- [Next.js proxy.ts official docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) -- full API reference, file convention, matcher config, migration guide
- [Next.js v16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- middleware to proxy rename confirmation, breaking changes
- [Zod v4 release notes](https://zod.dev/v4) -- API changes, import syntax, performance improvements
- Codebase analysis -- all 3 AI insight duplication sites, all 25 silent catch blocks, all 4 eslint-disable locations verified via grep

### Secondary (MEDIUM confidence)
- [Zod v4 migration guide](https://zod.dev/v4/changelog) -- breaking changes from v3 to v4
- [Next.js 16 middleware to proxy migration](https://dev.to/beyondit/nextjs-161-migration-refactoring-middlewarets-to-proxyts-without-breaking-auth-3kbh) -- practical migration patterns
- npm registry -- `npm view zod version` confirms 4.3.6 latest, `npm ls zod` confirms transitive availability

### Tertiary (LOW confidence)
- None -- all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Zod v4 version verified via npm, proxy.ts API verified via official docs
- Architecture: HIGH -- All 3 duplication sites code-reviewed, hook interface derived from actual code patterns
- Pitfalls: HIGH -- proxy.ts rename verified with official upgrade guide; Zod v4 API differences verified; stale closure risk identified from code analysis

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack, no fast-moving dependencies)
