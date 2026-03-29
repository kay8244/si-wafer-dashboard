# Technology Stack: Refactoring Tooling

**Project:** SI Wafer Dashboard — Code Refactoring
**Researched:** 2026-03-29
**Scope:** Tools and libraries needed to safely refactor a Next.js 16.1 + TypeScript 5.9 codebase

---

## Baseline Stack (Do Not Change)

These are project constraints. The refactoring does not modify them.

| Technology | Current Version | Role |
|------------|----------------|------|
| Next.js | 16.1.6 | Framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | 5.9.3 | Language |
| Tailwind CSS | 4.1.18 | Styling |
| Recharts | 3.7.0 | Charts |
| Vitest | 4.1.1 | Test runner (already installed) |
| ESLint | 9.39.2 | Linting (already installed) |
| better-sqlite3 | 12.8.0 | SQLite driver |
| @vercel/postgres | 0.10.0 | Production DB |

---

## Recommended Additions by Concern

### 1. Input Validation — Zod v4

**Install:**
```bash
npm install zod@^4.0.0
```

**Current version:** 4.x (stable, published to npm as `zod@^4.0.0`)

**Why Zod v4, not v3:**
- 6.5x faster object parsing than v3 — relevant since API routes run on every dashboard load
- 57% smaller bundle than v3; significant for serverless cold starts on Vercel
- Native TypeScript inference: schema and type are the same source of truth — no separate type declarations needed
- `z.prettifyError()` produces clean error messages for API responses without extra formatting code
- Already the community standard for Next.js API route validation; extensive official examples at dub.co/blog/zod-api-validation

**Migration risk from v3:** ZERO — this project has no existing Zod. Starting fresh on v4 avoids the v3→v4 migration entirely.

**Why NOT yup or joi:** yup has inferior TypeScript inference requiring manual type extraction; joi is Node-only and not designed for edge/serverless. Zod is the only validation library with first-class TypeScript support designed for both server and client use.

**Usage target:**
```typescript
// src/lib/schemas.ts — define once, use in API routes and components
import { z } from 'zod'

export const AiInsightSchema = z.object({
  tab: z.enum(['supply-chain', 'vcm', 'customer-detail']),
  context: z.string().min(1).max(10_000),
})

// In API route handler:
const parsed = AiInsightSchema.safeParse(await request.json())
if (!parsed.success) {
  return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 })
}
```

**Addresses concerns:** HP-2 (no input validation), CC-3 (unvalidated ai-insight context enables prompt injection)

---

### 2. Rate Limiting — @upstash/ratelimit + Upstash Redis

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Current version:** @upstash/ratelimit 2.0.8

**Why @upstash/ratelimit:**
- Purpose-built for serverless environments (Vercel, AWS Lambda, Cloudflare Workers). The key insight is that in-memory rate limiting does NOT work on Vercel — each serverless function invocation is a fresh process with no shared memory. Only a distributed store works correctly.
- Vercel KV (the first-party Vercel key-value store) IS powered by Upstash Redis, making this the natural integration: one service, first-party support, no additional infrastructure decisions.
- Supports sliding window, fixed window, and token bucket algorithms. Sliding window is recommended for AI endpoints (smooth burst control).
- Free tier: 10,000 commands/day on Upstash free plan — sufficient for an internal dashboard.

**Why NOT lru-cache or in-memory token bucket:** These reset on every cold start. On Vercel, each request may hit a different function instance. In-memory counters are per-instance, so a bad actor simply makes concurrent requests across instances to bypass the limit. This is a false sense of security.

**Why NOT Vercel KV directly:** @upstash/ratelimit already wraps Upstash Redis with the rate limiting logic built in. Using raw KV would mean reimplementing rate limiting logic manually.

**Required env vars (add to Vercel dashboard):**
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

**Usage target (Next.js middleware `src/middleware.ts`):**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'si-dashboard',
})

// Apply in middleware to /api/ai-insight, /api/transcript, /api/news
```

**Addresses concerns:** CC-2 (no auth/rate limiting), CC-3 (unbounded Anthropic/Tavily calls)

---

### 3. Dead Code Detection — Knip

**Install:**
```bash
npm install -D knip
```

**Current version:** 6.0.6 (very active; last published within days of research date)

**Why Knip:**
- Scans across the ENTIRE project graph: finds unused exports, unused files, unused dependencies in package.json, and unused devDependencies — all in one pass. ESLint can only detect unused variables within a single file.
- Has a Next.js plugin built in (100+ framework plugins) — understands App Router conventions and won't false-positive on `page.tsx`, `layout.tsx`, `error.tsx`, `route.ts` exports.
- Critical for this project: the codebase has ~2,400 lines of suspected dead mock data files (`src/data/vcm-mock.ts`, `customer-detail-mock.ts`, `supply-chain-mock.ts`) — Knip will definitively confirm whether they are imported anywhere, removing the "verify manually" burden.
- Single command: `npx knip` — no config needed for standard Next.js projects.

**Why NOT ts-prune:** ts-prune is archived/unmaintained as of 2023. Knip is the current community standard, explicitly recommended by the Effective TypeScript author.

**Why NOT relying on ESLint `no-unused-vars` alone:** ESLint only sees within a file. It cannot detect that a whole file or a cross-file export chain is dead.

**Add to package.json scripts:**
```json
"knip": "knip"
```

**Addresses concerns:** LP-2 (mock data files possibly dead), general codebase cleanup

---

### 4. Testing — Vitest (already installed) + @testing-library/react

**Install:**
```bash
npm install -D @testing-library/react @testing-library/dom @testing-library/user-event @vitejs/plugin-react jsdom
```

**Current versions:**
- Vitest: 4.1.1 (already installed — do NOT upgrade during refactoring; pin to current)
- @testing-library/react: 16.x (v16 adds full React 19 peer dependency support)
- @testing-library/user-event: 14.x

**Why these specific versions matter:**
- @testing-library/react v13 requires React 18. v16 updated peer deps to include React 19. Since this project runs React 19.2.4, installing v13 without `--legacy-peer-deps` will fail. Install without flags and npm will resolve to a compatible version automatically if using npm 11+.
- Vitest 4.x has a known snapshot formatting issue with React 19 (`@vitest/pretty-format` bundles react-is from React 18). Mitigation: avoid snapshot tests for React components; use assertion-based tests instead. Snapshot tests for pure data transformations are unaffected.

**Why NOT Jest:** Jest requires Babel or additional transform configuration for the App Router's ES module usage. Vitest is already installed and configured via `vitest.config.ts`; adding Jest would introduce a competing test runner. The project already has the right tool; the gap is missing test code, not missing test infrastructure.

**Why NOT React Testing Library for all tests:** The primary test targets per CONCERNS.md HP-1 are:
1. `src/lib/db.ts` — pure Node.js, no React, test with Vitest directly
2. API route handlers — pure functions, test with Vitest directly (mock `Request`/`Response`)
3. Data transformation functions (`buildCustomerExecutive`, VCM reconstruction) — pure functions, no React needed

RTL is needed only for the `useAiInsight` custom hook extraction. This keeps the test surface minimal and avoids async Server Component limitations (Next.js async Server Components cannot be tested with Vitest — confirmed by Next.js official docs).

**Recommended vitest.config.ts additions:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',     // default for DB/API tests
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

For hook tests requiring DOM, use `// @vitest-environment jsdom` per-file rather than globally — avoids importing `better-sqlite3` (native module) in a jsdom context which causes build errors.

**Addresses concerns:** HP-1 (near-zero test coverage)

---

### 5. Error Boundaries — Next.js Built-In Conventions (No New Library)

**Install:** Nothing. This is a file-convention feature of Next.js App Router.

**Pattern:** Create `src/app/error.tsx` and `src/app/global-error.tsx` using the App Router error boundary convention. Per official Next.js 16.x docs (verified 2026-03-25), the `error.tsx` file:
- Must be a Client Component (`'use client'`)
- Wraps the `page.tsx` in the same segment and all children
- Receives `error: Error & { digest?: string }` and `unstable_retry: () => void` props
- Does NOT wrap the `layout.tsx` in the same segment (important: errors in `layout.tsx` propagate to the parent segment's `error.tsx`)

**Why NOT react-error-boundary (npm package):** The Next.js App Router's file-convention error boundaries are the idiomatic solution and are already integrated with the framework's rendering pipeline. The `unstable_catchError` API (from `next/error`) is the new Next.js 16.x way to create component-level boundaries without a separate library. Using an external library adds a dependency for something the framework already provides.

**Implementation plan for this project:**

```
src/app/
  error.tsx          ← catches errors in page.tsx + all client components
  global-error.tsx   ← catches errors in layout.tsx (must include <html><body>)
```

For tab-level granularity (SupplyChainPage, VcmPage, CustomerDetailPage), wrap each with `unstable_catchError` from `next/error` — this prevents one tab's chart crash from blanking the entire dashboard.

**Addresses concerns:** CC-4 (no React error boundaries)

---

### 6. SQLite Connection Management — Singleton Pattern (No New Library)

**Install:** Nothing. Fix is a code change to `src/lib/db.ts`, not a library addition.

**Pattern:** Module-level singleton with process-exit cleanup.

```typescript
// src/lib/db.ts
let _db: Database | null = null

function getDb(): Database {
  if (!_db) {
    _db = new Database(dbPath, { readonly: false })
    // Only close on process exit, not per-request
    process.on('exit', () => _db?.close())
  }
  return _db
}
```

**Why no connection pooling library:** `better-sqlite3` is synchronous and uses a single connection per process. In a serverless context (Vercel), each function invocation is a separate process — there is no long-lived process to pool across. The singleton pattern is correct for both local dev (long-lived Node.js process) and serverless (short-lived process, no leaking).

**Why NOT switching to Prisma or Drizzle:** Adding an ORM during a refactoring-only project introduces migration risk and is explicitly out of scope per PROJECT.md constraints. The existing parameterized query patterns in `db.ts` are already safe against SQL injection. The fix is mechanical: replace `getSqliteDb()` calls in query functions with the singleton getter.

**Addresses concerns:** CC-1 (SQLite connection leak), MP-4 (inconsistent connection management)

---

### 7. Static Analysis — Enhanced ESLint Rules (Already Installed ESLint)

**No new tool install required.** Augment the existing `eslint.config.mjs` with additional rules from `typescript-eslint` (already present via `eslint-config-next`).

**Why the current ESLint config is insufficient:** `eslint-config-next` enables a curated subset of `typescript-eslint` rules focused on Next.js patterns. Several rules catching refactoring-relevant issues are not enabled by default.

**Recommended additional rules for `eslint.config.mjs`:**

```javascript
// Add to existing eslint.config.mjs
rules: {
  // Catch the 4 suppressed hook dependency warnings (LP-5)
  'react-hooks/exhaustive-deps': 'error',  // upgrade from warn to error

  // Catch complexity growth in God Components (HP-3)
  'complexity': ['warn', { max: 15 }],

  // Catch empty catch blocks (MP-3)
  'no-empty': ['error', { allowEmptyCatch: false }],

  // Catch console.warn used as only error reporting (LP-4)
  'no-console': ['warn', { allow: ['error'] }],

  // Catch any[] usage weakening type safety
  '@typescript-eslint/no-explicit-any': 'warn',

  // Ensure all caught errors are typed (safer catch blocks)
  '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
}
```

**Why complexity: 15:** The God Components currently exceed cyclomatic complexity of 30+. Setting max: 15 will flag them on first lint run, providing a quantitative target for decomposition. This is not blocking (warn not error) so it does not break existing builds.

**Why NOT adding ESLintCC separately:** ESLintCC is a standalone complexity reporter. The built-in `complexity` rule from ESLint core serves the same purpose without an additional tool.

**Addresses concerns:** HP-3 (God components), LP-5 (eslint-disable suppressions), MP-3 (silent errors)

---

## Alternatives Considered and Rejected

| Category | Recommended | Alternative | Rejection Reason |
|----------|------------|-------------|-----------------|
| Validation | Zod v4 | yup | yup requires `.infer` workarounds; Zod types are first-class TypeScript |
| Validation | Zod v4 | joi | joi is Node-only; incompatible with edge/serverless |
| Validation | Zod v4 | valibot | valibot is newer with smaller ecosystem; Zod has more Next.js integration examples |
| Rate limiting | @upstash/ratelimit | lru-cache in-memory | In-memory doesn't persist across serverless invocations; false security |
| Rate limiting | @upstash/ratelimit | express-rate-limit | Designed for Express/Node long-lived servers; not serverless-compatible |
| Dead code | knip | ts-prune | ts-prune is archived and unmaintained since 2023 |
| Dead code | knip | ESLint no-unused-vars | File-scoped only; misses cross-file dead export chains |
| Testing | Vitest (existing) | Jest | Vitest already installed; Jest would duplicate infrastructure |
| Error boundaries | Next.js built-in | react-error-boundary | Framework-native is always preferred; no external dep needed |
| DB connection | Singleton pattern | Prisma | ORM migration is out of scope per PROJECT.md constraints |
| DB connection | Singleton pattern | Drizzle | Same — ORM introduction is out of scope |
| Complexity | ESLint complexity rule | eslintcc | ESLintCC is a standalone tool for the same feature ESLint core already provides |

---

## Complete Install Command

```bash
# New runtime dependencies
npm install zod@^4.0.0 @upstash/ratelimit @upstash/redis

# New dev dependencies
npm install -D knip @testing-library/react @testing-library/dom @testing-library/user-event @vitejs/plugin-react jsdom
```

**Required env vars to add in Vercel dashboard after installing rate limiting:**
```
UPSTASH_REDIS_REST_URL=<from Upstash console>
UPSTASH_REDIS_REST_TOKEN=<from Upstash console>
```

---

## Confidence Assessment

| Tool | Confidence | Basis |
|------|------------|-------|
| Zod v4 | HIGH | Official docs at zod.dev/v4 verified; version confirmed from npm |
| @upstash/ratelimit | HIGH | npm version 2.0.8 confirmed; Vercel official template uses this library |
| Knip | HIGH | npm version 6.0.6 confirmed; Effective TypeScript author explicit recommendation |
| @testing-library/react v16 | MEDIUM | React 19 peer dep support confirmed from GitHub releases; exact version not pinned from official docs |
| Vitest snapshot issue | MEDIUM | GitHub issue #6908 documents React 19 snapshot incompatibility; workaround (avoid snapshots) is reliable |
| Next.js error.tsx convention | HIGH | Official Next.js 16.x docs verified (lastUpdated: 2026-03-25) from nextjs.org |
| SQLite singleton | HIGH | better-sqlite3 docs + Next.js singleton pattern documented pattern; no library risk |
| ESLint complexity rule | HIGH | ESLint core rule, stable; Next.js 16 ships ESLint 9 flat config compatibility |

---

## Sources

- [Zod v4 Release Notes](https://zod.dev/v4) — verified current version and install command
- [Zod Migration Guide](https://zod.dev/v4/changelog) — v3→v4 breaking changes
- [Dub.co: Zod API Validation with Next.js](https://dub.co/blog/zod-api-validation) — real-world Next.js API route usage
- [Next.js Error Handling Docs](https://nextjs.org/docs/app/getting-started/error-handling) — official, updated 2026-03-25
- [Next.js error.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/error) — file convention details
- [@upstash/ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) — version 2.0.8 confirmed
- [Upstash: Rate Limiting Next.js](https://upstash.com/blog/nextjs-ratelimiting) — implementation guide
- [Vercel Template: Ratelimit with Upstash](https://vercel.com/templates/next.js/ratelimit-with-upstash-redis) — first-party Vercel endorsement
- [Knip official site](https://knip.dev/) — framework plugin list, Next.js support confirmed
- [knip npm](https://www.npmjs.com/package/knip) — version 6.0.6 confirmed
- [Effective TypeScript: Use Knip](https://effectivetypescript.com/2023/07/29/knip/) — community recommendation
- [@testing-library/react npm](https://www.npmjs.com/package/@testing-library/react) — React 19 peer dep
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) — official setup
- [Vitest React 19 snapshot issue #6908](https://github.com/vitest-dev/vitest/issues/6908) — known limitation
- [ESLint complexity rule](https://eslint.org/docs/latest/rules/complexity) — core rule docs
- [Knip dead code detection guide](https://dev.to/ajmal_hasan/knip-the-ultimate-dead-code-detector-for-javascript-typescript-projects-3463) — practical usage
