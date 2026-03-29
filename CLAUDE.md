a# Project Rules

## General Rules

- Do NOT spend time exploring and planning without producing changes. If a task requires more than 2 minutes of exploration, summarize findings so far and ask the user whether to proceed with implementation or continue investigating. Bias toward action.
- Primary language is TypeScript (Next.js). When making changes, always run `npm run build` and verify zero errors before considering a task complete. Do not just run the dev server - confirm the production build passes.
- Debug attempts are limited to 3 retries. If the same error occurs 3 times, STOP retrying. Instead summarize: 1) what you tried, 2) what the error pattern suggests, 3) root cause theory, 4) what info is needed to proceed.

## API Integration

- When working with Korean public APIs (data.go.kr, Naver, DART), always verify:
  1. The exact endpoint URL (domains change frequently)
  2. Response format (XML vs JSON)
  3. API key encoding (avoid double URL-encoding)
  4. Test with a single API call before batch operations
- For any API calls added/modified, verify: (a) endpoint URL matches documentation, (b) field names match exact casing from API response, (c) error handling exists for 404/timeout/auth failures.

## Styling / CSS

- When dealing with CSS dark mode, ensure specificity is correct. Do NOT use `:where(.dark)` as it has zero specificity. Use `.dark` class selector directly.
- Tailwind 4.1 사용 중. dark mode 클래스는 `.dark` 직접 사용할 것.

## Data & Caching

- After any data-related change (DB queries, API endpoints, caching logic), always clear all caches (localStorage, file cache, memory cache, SQLite WAL) and verify fresh data is served before considering the task done.

## Navigation & Routing

- When modifying navigation, routes, or URL structures, always verify ALL existing pages/links still work — not just the ones being changed. Run a quick check of all nav links before committing.

## UI & Charts Conventions

- This project is primarily TypeScript. Always use TypeScript (not JavaScript). For dashboard work: chart heights should default to 540px unless specified. Y-axis labels and units must match the actual data being displayed. Always verify color values render correctly (not defaulting to black).

## Deployment Checklist

- Before deploying to Vercel, verify: 1) All environment variables are set correctly in Vercel dashboard, 2) Run `npm run build` locally and confirm no errors, 3) After deploy, check the live URL to confirm changes are reflected (not cached by CDN).

## Project-Specific Notes

- Stack: Next.js 16.1 | React 19 | Recharts 3.7 | Tailwind 4.1 | TypeScript 5.9
- External APIs: Yahoo Finance, DART, Anthropic AI, Tavily
- When Naver Maps errors occur in MapViewClient.tsx, check for: 1) null reference on `naver.maps` (add null checks), 2) useEffect dependency array issues. These are the two most common root causes.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**SI Wafer Dashboard — Code Refactoring**

실트론 MI플랫폼 현황판(SI Wafer Dashboard)의 코드 리팩토링 프로젝트. Next.js 16.1 + React 19 기반의 반도체 시장 인텔리전스 대시보드로, Supply Chain / VCM / Customer Detail 3개 탭으로 구성되어 있다. 기존 기능을 100% 유지하면서 코드 가독성, 품질, 데이터 적재 편의성을 개선하는 것이 목표다.

**Core Value:** 기존 대시보드 기능을 깨뜨리지 않으면서 코드베이스를 유지보수 가능하고 이해하기 쉬운 상태로 만든다.

### Constraints

- **Tech stack**: Next.js 16.1 / React 19 / Recharts 3.7 / Tailwind 4.1 / TypeScript 5.9 유지
- **기능 보존**: 모든 기존 기능이 리팩토링 후에도 동일하게 동작해야 함
- **배포 환경**: Vercel 서버리스 + Vercel Postgres 유지
- **빌드 검증**: 모든 변경 후 `npm run build` 성공 필수
- **데이터 적재 대상**: 개발자 (CLI 사용 가능한 사용자)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All application code (frontend + backend)
- CSS (Tailwind 4.1) - Styling via `src/app/globals.css`
- SQL - Database queries in `src/lib/db.ts` (SQLite + Postgres)
## Runtime
- Node.js 25.4.0 (local development)
- Vercel serverless functions (production)
- npm 11.7.0
- Lockfile: `package-lock.json` (present)
## Frameworks
- Next.js 16.1.6 - Full-stack React framework (App Router)
- React 19.2.4 - UI library
- Recharts 3.7.0 - Charting library for dashboard visualizations
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- `@tailwindcss/postcss` 4.1.18 - PostCSS plugin for Tailwind v4
- PostCSS 8.5.6 - CSS processing
- Vitest 4.1.1 - Test runner
- Config: `vitest.config.ts`
- Next.js built-in Turbopack (dev mode)
- `tsx` 4.21.0 - TypeScript execution for scripts
## Key Dependencies
- `next` 16.1.6 - App framework, routing, API routes, SSR
- `react` / `react-dom` 19.2.4 - UI rendering
- `recharts` 3.7.0 - All chart components (bar, line, area charts)
- `better-sqlite3` 12.8.0 - Local SQLite database driver
- `@vercel/postgres` 0.10.0 - Vercel Postgres client (production)
- `@anthropic-ai/sdk` 0.74.0 - Anthropic Claude API for AI insights
- `@types/better-sqlite3` 7.6.13 - SQLite type definitions
- `@types/pg` 8.18.0 - PostgreSQL type definitions
- `pg` 8.20.0 - PostgreSQL driver (used in seed script only)
- `dotenv` 17.3.1 - Environment variable loading for scripts
- `tsx` 4.21.0 - Script runner for seed/validate commands
- `vitest` 4.1.1 - Unit testing framework
- `eslint` 9.39.2 + `eslint-config-next` 16.1.6 - Linting
## TypeScript Configuration
- `target`: ES2017
- `module`: esnext with `bundler` moduleResolution
- `strict`: true
- `jsx`: react-jsx
- `incremental`: true
- Path alias: `@/*` maps to `./src/*`
- Next.js plugin enabled
## Build System & Scripts
- `serverExternalPackages: ['better-sqlite3']` - Excludes native module from bundling
## Configuration Files
| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler options |
| `next.config.ts` | Next.js framework config |
| `postcss.config.mjs` | PostCSS with Tailwind plugin |
| `eslint.config.mjs` | ESLint with next config preset |
| `vitest.config.ts` | Vitest test runner config |
## Environment Configuration
- `ANTHROPIC_API_KEY` - For AI insight generation and news summarization
- `TAVILY_API_KEY` - For transcript search via Tavily API
- `POSTGRES_URL` or `DATABASE_URL` - Switches DB from SQLite to Postgres (Vercel production)
- If `POSTGRES_URL` exists: uses `@vercel/postgres`
- Otherwise: uses `better-sqlite3` with local file at `data/dashboard.db`
## Platform Requirements
- Node.js >= 25.x (uses ES2017+ features)
- SQLite3 native module (auto-compiled via better-sqlite3)
- ~4.2MB SQLite database file in `data/dashboard.db`
- Vercel serverless deployment
- Vercel Postgres database
- Environment variables configured in Vercel dashboard
- No `vercel.json` present (uses defaults)
## Data Layer
- `src/data/supply-chain-mock.ts` (481 lines)
- `src/data/customer-detail-mock.ts` (773 lines)
- `src/data/vcm-mock.ts` (1189 lines)
- `customer-detail-monthly.csv`
- `foundry-nodes.csv`
- `memory-price.csv`
- `server-indicators.csv`
- `supply-chain-indicators.csv`
- `supply-chain-internal.csv`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Naming Patterns
- Components: PascalCase `.tsx` files, one component per file: `CustomerDetailPage.tsx`, `IndicatorChart.tsx`
- Hooks: camelCase with `use` prefix: `useCustomerDetailData.ts`, `useDarkMode.ts`
- Library utilities: kebab-case `.ts` files: `chart-utils.ts`, `data-generation.ts`, `news-utils.tsx`
- API routes: Next.js App Router convention `route.ts` inside directory-named folders: `src/app/api/customer-detail/route.ts`
- Type definition files: kebab-case: `src/types/indicators.ts`
- Mock data files: kebab-case with `-mock` suffix: `src/data/customer-detail-mock.ts`
- Use camelCase for all functions: `formatCurrency`, `pearsonCorrelation`, `buildCustomerExecutive`
- Component functions use PascalCase and are always `export default function ComponentName`: never arrow function exports for components
- Utility/helper functions are named exports (non-default): `export function formatCurrency(...)`
- camelCase for local variables and state: `selectedCustomer`, `timeRange`, `aiInsight`
- UPPER_SNAKE_CASE for module-level constants: `CURRENCY_FORMATTERS`, `PREMIUM_SOURCES`, `SYSTEM_PROMPT`, `MONTHLY_FIELDS`
- Color arrays use UPPER_SNAKE_CASE: `SELECTED_INDICATOR_COLORS`, `INDICATOR_COLORS`, `CHART_COLORS`
- Use `interface` for object shapes with named properties: `interface SupplyChainIndicator { ... }`
- Use `type` for unions, aliases, and simple primitives: `type V3Tab = 'supplyChain' | 'vcm' | 'customerDetail'`
- Type names are PascalCase: `CustomerDetailId`, `ViewMode`, `MetricRow`
- Props interfaces are named either `Props` (when file-local) or `{Component}Props`: `interface IndicatorChartProps`
- ID-style types use `Id` suffix: `CustomerDetailId`, `SupplyChainCategoryId`, `FoundryCompanyId`
## Code Style
- No Prettier configuration detected. No `.prettierrc` file.
- 2-space indentation throughout (evident from all source files)
- Single quotes for strings: `'use client'`, `'monotone'`
- Semicolons at end of statements (consistent)
- Trailing commas in multiline structures
- ESLint 9 with flat config at `eslint.config.mjs`
- Extends `eslint-config-next` only (no additional plugins or custom rules)
- Lint command: `npm run lint` (runs `eslint src/`)
- Selective `eslint-disable` comments used for:
## TypeScript Configuration
- Target: ES2017
- Module: ESNext with bundler resolution
- JSX: react-jsx (automatic runtime)
- Incremental compilation enabled
- Path alias: `@/*` maps to `./src/*`
- Use `import type` for type-only imports: `import type { CustomerExecutive, CustomerDetailId } from '@/types/indicators'`
- Generic type parameters on utility functions: `export function parseMeta<T>(row: MetricRow): T`
- Null handling uses explicit null checks and `?? fallback` pattern, not non-null assertions
- Union types for fixed sets: `type ViewMode = 'actual' | 'threeMonthMA' | 'twelveMonthMA' | 'mom' | 'yoy'`
## Import Organization
- Always use `@/` alias for cross-directory imports: `@/types/indicators`, `@/hooks/useDarkMode`, `@/lib/cache`
- Use relative `./` imports only for sibling files in the same directory: `import ExecutivePanel from './ExecutivePanel'`
- Never use `../` to go up directories; use `@/` alias instead
## Component Patterns
- 30 files have `'use client'` directive (all components, all hooks, the main page)
- Zero `'use server'` directives
- API route handlers (`src/app/api/*/route.ts`) are server-side by default (no directive needed)
- `src/app/layout.tsx` is a server component (no `'use client'`)
- In practice, nearly all UI code is client-rendered; server components are limited to the root layout
- Always use `export default function` for components (never arrow functions or named exports)
- Props destructured in function parameters
- State initialization at top of component body
- Conditional rendering via `&&` operator: `{showNews && <CustomerNewsPanel ... />}`
- Loading states use spinner div pattern: `<div className="h-8 w-8 animate-spin rounded-full border-4 ..." />`
- Error states show Korean text: `<p className="text-sm text-red-500">...</p>`
## Error Handling
## Logging
- `console.error('[tag] description:', err)` in API route catch blocks with bracketed tag: `[customer-detail]`, `[ai-insight]`, `[supply-chain]`
- `console.warn('[db] queryName failed:', err)` in database layer for non-critical failures
- No `console.log` statements in production code
- No client-side logging at all (hooks/components silently catch errors)
## Comments
- Section dividers use `// -- Section Name --` with em-dash box style in large files
- Korean comments explain domain logic: `// 6개월 이전 기사 제외` ("exclude articles older than 6 months")
- JSDoc-style `/** ... */` comments on exported utility functions in `src/lib/` files
- No JSDoc on component props or interfaces (types are self-documenting)
- Inline `/* ignore */` in empty catch blocks
- `src/lib/db.ts` has a header comment explaining the dual-database strategy
- `src/lib/data-generation.ts` has a module-level `/** ... */` explaining purpose
- Most component files have no file-level comment
## CSS/Styling Conventions
- Tailwind CSS 4.1 via `@tailwindcss/postcss` plugin (`postcss.config.mjs`)
- CSS import: `@import "tailwindcss"` in `src/app/globals.css`
- Utility-first approach: all styling via Tailwind classes in JSX
- No component-level CSS files; only one global CSS file: `src/app/globals.css`
- Manual `.dark` class toggled on `<html>` element via `src/hooks/useDarkMode.ts`
- Dark mode persisted in `localStorage` under key `'theme'`
- Custom variant defined: `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`
- IMPORTANT (from CLAUDE.md): Use `.dark` class selector directly. Do NOT use `:where(.dark)` as it has zero specificity.
- Dark mode overrides defined as plain CSS in `globals.css` targeting `.dark .{utility-class}` patterns
- Component-level dark mode uses Tailwind `dark:` prefix: `dark:bg-gray-700 dark:text-gray-400`
- Light backgrounds: `bg-white`, `bg-gray-50`, `bg-gray-100`
- Dark backgrounds override in CSS: `bg-white` becomes `#1e293b`, `bg-gray-50` becomes `#0f172a`
- Accent colors: blue-600 for primary actions, indigo for AI features, amber for premium badges
- Chart colors are hardcoded hex values in constants: `CHART_COLORS`, `INDICATOR_COLORS`
- Max width container: `max-w-[1400px] mx-auto px-4 py-2 sm:px-6 lg:px-8`
- Card pattern: `rounded-lg border border-gray-200 bg-white p-5 shadow-md`
- Flex-based layouts (no CSS Grid usage detected)
- Fixed percentage widths for panels: `w-[70%]` and `w-[30%]`
- Chart height default: 320px in most charts (via ResponsiveContainer)
- Font sizes use pixel-based Tailwind classes: `text-[11px]`, `text-[13px]`, `text-[15px]`
## Data Fetching Patterns
- Server-side file + memory cache in `src/lib/cache.ts` with 24-hour TTL
- Used for AI insights and news summaries (expensive API calls)
- No client-side caching (SWR, React Query, etc.) -- raw `fetch` in hooks
- `AbortController` used in `useNews` for cleanup on unmount
## Function Design
- Hooks return `{ data, loading, error }` object
- Formatters return strings
- API routes return `NextResponse.json()`
- Database queries return `Promise<MetricRow[]>`
## Module Design
- Components: single `export default function` per file
- Utility modules: multiple named exports per file (`src/lib/format.ts`, `src/lib/chart-utils.ts`)
- Type files: all types/interfaces are named exports from `src/types/indicators.ts`
- Hooks: single named export per file (`export function useXxx`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single route (`/`) with client-side tab switching (no URL-based routing between views)
- All pages are `'use client'` -- no Server Components for data fetching; data flows through API routes
- Dual-database abstraction: SQLite locally, Postgres (`@vercel/postgres`) on Vercel
- Flat "metrics" table stores all domain data via a flexible schema (tab/category/customer columns)
- External AI services (Anthropic Claude, Google News RSS, Tavily) called from API routes with file+memory caching
- No authentication, no middleware, no protected routes
## Layers
- Purpose: Render dashboard UI with charts, tables, and interactive controls
- Location: `src/components/`
- Contains: Page-level containers (`SupplyChainPage.tsx`, `VcmPage.tsx`, `CustomerDetailPage.tsx`), chart components (Recharts wrappers), table components, sidebar/panel components
- Depends on: Custom hooks (`src/hooks/`), utility libraries (`src/lib/chart-utils.ts`, `src/lib/format.ts`, `src/lib/news-utils.tsx`)
- Used by: `src/app/page.tsx` via `src/components/V3Container.tsx`
- Purpose: Fetch data from API routes and manage loading/error state
- Location: `src/hooks/`
- Contains: `useSupplyChainData.ts`, `useVcmData.ts`, `useCustomerDetailData.ts`, `useNews.ts`, `useDarkMode.ts`
- Depends on: Browser `fetch()` to internal API routes
- Used by: Page-level components
- Pattern: Simple `useState` + `useEffect` with `fetch()`. No SWR, React Query, or advanced caching on the client side.
- Purpose: Query the database, reconstruct domain objects from flat metric rows, call external services
- Location: `src/app/api/`
- Contains: 6 route handlers (GET endpoints for supply-chain, vcm, customer-detail, news, transcript; POST for ai-insight)
- Depends on: `src/lib/db.ts` (database), `src/lib/cache.ts` (file/memory cache), `@anthropic-ai/sdk`, Tavily API
- Used by: Client hooks via `fetch('/api/...')`
- Purpose: Abstract SQLite vs Postgres access behind a uniform async API
- Location: `src/lib/db.ts`
- Contains: `queryMetrics()`, `queryAll()`, `queryMetricsLike()`, `queryMetricsIn()`, `queryByCustomer()`, schema management
- Depends on: `better-sqlite3` (local), `@vercel/postgres` (production)
- Used by: All API route handlers
- Purpose: Avoid redundant external API calls (news, AI summaries, transcripts)
- Location: `src/lib/cache.ts`
- Contains: `getCached()`, `setCache()`, `clearCache()` with 24-hour TTL
- Strategy: File-based cache in `cache/` directory (JSON files) with in-memory `Map` fallback
- Used by: `src/app/api/news/route.ts`, `src/app/api/ai-insight/route.ts`, `src/app/api/transcript/route.ts`
- Purpose: Populate the database from mock data or external sources
- Location: `scripts/seed.ts`, `scripts/seed-postgres.ts`
- Contains: Seed scripts that read from `src/data/*-mock.ts` and insert into the metrics table
- Depends on: `src/lib/db.ts`, mock data files
- Triggered by: `npm run seed` (also runs as `postinstall`)
## Data Flow
- No global state management library (no Redux, Zustand, Jotai, etc.)
- Each page-level component manages its own state via `useState`
- Data fetching state (loading/error/data) managed in custom hooks
- Dark mode state stored in `localStorage` and managed via `useDarkMode` hook (toggles `.dark` class on `<html>`)
- Tab navigation state lives in `V3Container` (`useState<V3Tab>`)
## Key Abstractions
- Purpose: Single table stores all dashboard data across all tabs
- Definition: `src/lib/db.ts` (lines 9-20)
- Fields: `tab`, `date`, `customer`, `category`, `value`, `unit`, `is_estimate`, `version`, `metadata` (JSON)
- Pattern: EAV (Entity-Attribute-Value) pattern where `tab` = domain, `category` = metric type, `customer` = entity, `metadata` = JSON blob for additional fields
- Trade-off: Extremely flexible (any new metric type just adds rows), but API routes contain heavy reconstruction logic to convert flat rows back into typed domain objects
- Purpose: Three dashboard views accessible via client-side tabs
- Container: `src/components/V3Container.tsx`
- Pages: `SupplyChainPage`, `VcmPage`, `CustomerDetailPage`
- Pattern: Conditional rendering based on `activeTab` state. Each page is fully independent with its own data fetching hook.
- Purpose: Encapsulate fetch + loading/error state for each API endpoint
- Examples: `src/hooks/useSupplyChainData.ts`, `src/hooks/useVcmData.ts`, `src/hooks/useCustomerDetailData.ts`
- Pattern: `useState` + `useEffect` with `fetch()`, no deduplication, no refetching, no error retry
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: Browser navigating to `/`
- Responsibilities: Renders the single-page dashboard via `V3Container`
- Location: `src/app/api/*/route.ts`
- Triggers: Client-side `fetch()` calls from hooks
- Endpoints:
- Location: `scripts/seed.ts` (SQLite), `scripts/seed-postgres.ts` (Postgres)
- Triggers: `npm run seed`, `npm run seed:pg`, or `postinstall`
- Responsibilities: Reads mock data from `src/data/*-mock.ts`, inserts into `metrics` table
## Error Handling
- All route handlers wrap their logic in `try/catch`
- On error: log to `console.error`, return `NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })`
- No structured error codes or error typing
- Individual query functions (`queryAll`, `queryMetricsLike`, etc.) catch errors, log with `console.warn`, and return empty arrays
- SQLite connections opened per-request (except in seed scripts which use a persistent connection)
- Hooks expose `error: string | null` state
- Page components show a simple red error message: "데이터를 불러올 수 없습니다"
- No retry logic, no error boundaries
- All cache operations (read/write/delete) silently catch errors
- If file cache fails, falls back to in-memory `Map`
## Cross-Cutting Concerns
- `console.error()` / `console.warn()` only. No structured logging framework.
- Prefixed log messages in API routes: `[supply-chain]`, `[vcm]`, `[customer-detail]`, `[ai-insight]`
- No input validation library (no Zod, Yup, etc.)
- API routes do minimal parameter checking (e.g., `if (!tab || !context)` in ai-insight)
- Query parameters used directly in database queries (parameterized, so SQL injection safe)
- None. Dashboard is fully open/public.
- Managed via `useDarkMode` hook in `src/hooks/useDarkMode.ts`
- Toggles `.dark` class on `<html>` element
- Persisted in `localStorage` under key `theme`
- CSS overrides in `src/app/globals.css` using `.dark` selector (not Tailwind's `dark:` variant for base colors -- manual overrides for fine-grained control)
- UI text is hardcoded in Korean
- Data labels and chart axes use mixed Korean/English
- No i18n framework
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
