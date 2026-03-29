# Phase 2: Core Quality - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

AI Insight 페칭 중복을 단일 훅으로 통합하고, API 엔드포인트에 입력 검증(Zod)과 Rate Limiting, 인증(Basic Auth)을 추가하여 코드 품질과 보안을 개선한다. 빈 catch 블록에 구조화된 에러 로깅을 추가한다.

</domain>

<decisions>
## Implementation Decisions

### useAiInsight 훅 설계 (QUAL-01, QUAL-02, QUAL-07)
- **D-01:** Fetch/State만 추출 — 훅은 aiInsight/aiLoading/aiOpen state + fetchAiInsight() + deps 기반 auto-refetch를 담당. context 빌드 로직은 각 컴포넌트에 남긴다. 훅 인터페이스: `useAiInsight(tab, buildContext, deps)`
- **D-02:** deps 기반 auto-refetch 포함 — 훅이 deps 배열을 받아 변경 시 자동 refetch. 이를 통해 eslint-disable react-hooks/exhaustive-deps 억제 3개 제거 가능.
- **D-03:** AiInsightPanel UI 컴포넌트도 함께 추출 — useAiInsight 훅 + AiInsightPanel 컴포넌트를 한 세트로 추출. 컴포넌트는 `<AiInsightPanel {...aiProps} />`만 렌더링하면 됨.

### API 보안 전략 (QUAL-05, QUAL-06)
- **D-04:** Basic Auth 방식 — 환경변수로 아이디/비밀번호 설정. 내부 도구에 적합하고 구현 단순. Vercel 대시보드에서 환경변수만 설정하면 동작.
- **D-05:** Rate Limiting은 비용 발생 API만 — /api/ai-insight, /api/transcript, /api/news 3개만 적용. 데이터 조회 API는 DB만 접근하므로 불필요.
- **D-06:** Next.js middleware에 통합 구현 — src/middleware.ts에 Basic Auth + Rate Limiting 통합. matcher로 대상 선별. 각 라우트에 개별 코드 추가하지 않음.

### Zod 검증 범위 (QUAL-03)
- **D-07:** QUAL-03 명시 엔드포인트만 — /api/ai-insight(POST body), /api/transcript(query params), /api/news(query params) 3개만 적용.
- **D-08:** 타입 + 길이 제한 수준 — tab: string max(50), context: string max(10000) 등 타입 검사와 문자열 길이 제한 추가. 비용 남용/프롬프트 인젝션 방지.

### 에러 로깅 전략 (QUAL-04)
- **D-09:** 모든 silent catch에 console.error 추가 — cache.ts(5곳), API 라우트(6곳+), db.ts(4곳) 전수 적용.
- **D-10:** 기존 패턴 유지 — console.error('[tag] description:', err) 형식. 새로운 로깅 라이브러리 도입 없이 일관성만 확보.

### Claude's Discretion
- useAiInsight 훅의 구체적 내부 구현 (useRef 관리, AbortController 등)
- AiInsightPanel 컴포넌트의 구체적 Props 인터페이스 설계
- Rate Limiting 토큰 버킷의 구체적 수치 (요청 수/시간 등)
- Basic Auth 환경변수 네이밍 (e.g. DASHBOARD_USER, DASHBOARD_PASS)
- Zod 스키마의 각 필드별 구체적 제약조건
- SupplyChainPage.tsx의 4번째 eslint-disable 처리 방식 (useAiInsight 추출과 무관한 곳)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI Insight 중복 패턴
- `src/components/supply-chain/IndicatorChart.tsx` (lines 90-167) — AI insight fetch/state/refetch 패턴 + 상관계수 context 빌드
- `src/components/customer-detail/ExternalComparison.tsx` (lines 509-601) — AI insight fetch/state/refetch 패턴 + 웨이퍼 분석 context 빌드
- `src/components/vcm/DemandBarChart.tsx` (lines 181-252) — AI insight fetch/state/refetch 패턴 + 수요 분석 context 빌드

### API 라우트
- `src/app/api/ai-insight/route.ts` — POST endpoint, Anthropic 호출, MD5 캐시 키
- `src/app/api/transcript/route.ts` — Tavily 호출, query params
- `src/app/api/news/route.ts` — Google News RSS, query params

### 에러 로깅 대상
- `src/lib/cache.ts` — 5개 silent catch 블록
- `src/lib/db.ts` — 4개 console.warn catch (빈 배열 반환)
- `src/app/api/supply-chain/route.ts` — 3개 `catch { /* ignore */ }`
- `src/app/api/transcript/route.ts` — 3개 empty catch

### Concerns & Architecture
- `.planning/codebase/CONCERNS.md` — CC-2(인증없음), CC-3(Rate Limiting없음), HP-2(입력검증없음), HP-4(AI중복), MP-3(silent catch) 상세 분석
- `.planning/codebase/CONVENTIONS.md` — 네이밍 패턴, import 순서, 컴포넌트 구조
- `.planning/REQUIREMENTS.md` — QUAL-01~QUAL-07 상세 요구사항

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/`: 5개 훅 존재 (useCustomerDetailData, useDarkMode, useNews, useSupplyChainData, useVcmData) — useAiInsight도 동일 디렉토리에 추가
- 기존 훅 패턴: `{ data, loading, error }` 반환, useState + useEffect + fetch
- API 라우트: try/catch + console.error('[tag]') + NextResponse.json 패턴 확립

### Established Patterns
- 훅: camelCase `use` prefix, 단일 named export per file
- 컴포넌트: PascalCase, `export default function`
- 에러 로깅: `console.error('[tag] description:', err)` 형식
- 다크모드: `.dark` 클래스 기반 CSS 오버라이드
- eslint-disable: 4개 존재 (3개는 useAiInsight 추출로 제거, 1개는 SupplyChainPage)

### Integration Points
- `src/middleware.ts` 신규 생성 필요 — 현재 미들웨어 없음
- `src/hooks/useAiInsight.ts` 신규 생성
- `src/components/common/AiInsightPanel.tsx` 신규 생성 (또는 적절한 위치에)
- 3개 컴포넌트에서 기존 AI insight 코드 제거 후 훅/컴포넌트로 교체

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-quality*
*Context gathered: 2026-03-29*
