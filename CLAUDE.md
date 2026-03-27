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

