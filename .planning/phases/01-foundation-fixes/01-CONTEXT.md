# Phase 1: Foundation Fixes - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Critical 버그 수정 및 빌드 오염 요소 제거. SQLite 커넥션 릭 해결, Error Boundary 추가, postinstall/mock 정리, devDependencies 분류 수정. 이후 모든 리팩토링이 안전하게 진행될 수 있는 기반을 만든다.

</domain>

<decisions>
## Implementation Decisions

### 에러 바운더리 전략
- **D-01:** 차트 개별 래핑 — 각 Recharts 컴포넌트마다 에러 바운더리 적용. 하나가 깨져도 나머지 차트는 정상 표시.
- **D-02:** 폴백 UI는 간결한 한국어 에러 메시지 + 재시도 버튼. "차트를 표시할 수 없습니다" 한 줄과 재시도 버튼만 표시. 에러 상세는 console.error로만 출력.
- **D-03:** error.tsx와 global-error.tsx 모두 생성. error.tsx는 페이지 레벨 에러 포착, global-error.tsx는 root layout 에러 포착.

### Mock 데이터 처리
- **D-04:** src/data/*-mock.ts 파일을 삭제하지 않고 테스트 픽스처로 이동. 프로덕션 번들에서는 제거.
- **D-05:** 개발/데모 환경에서는 mock 데이터를 사용하고, 실환경에서는 API로 전환할 수 있는 구조. 환경 분리가 핵심.

### Seed 스크립트 전략
- **D-06:** postinstall 훅 제거 후 seed는 명시적 수동 실행(npm run seed)으로 전환. Mock 기반을 유지하되, 환경변수로 mock vs 실DB 전환 가능하게 구성.
- **D-07:** 향후 API 호출로 실데이터를 적재할 수 있는 확장 가능한 구조로 설계. Phase 1에서는 mock 기반 seed만 구현하되, 데이터 소스를 추상화하여 나중에 API 소스를 추가할 수 있도록 한다.

### Claude's Discretion
- SQLite 싱글턴 패턴의 구체적 구현 방식 (모듈 레벨 변수, process.exit 핸들링 등)
- devDependencies 이동 대상 패키지 선별
- ErrorBoundary 컴포넌트의 구체적 구현 패턴 (class component vs react-error-boundary 라이브러리)
- Mock 파일 이동 목적지 디렉토리 구조

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Critical Concerns
- `.planning/codebase/CONCERNS.md` — CC-1(SQLite 릭), CC-4(Error Boundary 없음), MP-2(devDependencies), MP-6(postinstall), LP-2(mock 파일) 상세 분석

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — 듀얼 DB 전략, 데이터 흐름, 에러 처리 현황
- `.planning/codebase/STRUCTURE.md` — 디렉토리 구조, src/data/ 위치, scripts/ 위치

### Requirements
- `.planning/REQUIREMENTS.md` — FOUN-01~FOUN-06 상세 요구사항

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts`: getSqliteDb() 함수가 싱글턴으로 변환 대상. getDb() (seed용)는 이미 싱글턴 패턴 — 참조 가능.
- `scripts/seed.ts`, `scripts/seed-postgres.ts`: mock 데이터에서 DB로 적재하는 기존 로직.

### Established Patterns
- API 라우트: try/catch + console.error + NextResponse.json({ error }) 패턴
- 클라이언트 에러: hooks에서 error state 노출, 컴포넌트에서 빨간 텍스트로 표시
- 다크모드: `.dark` 클래스 기반 CSS 오버라이드

### Integration Points
- `src/app/layout.tsx`: global-error.tsx가 여기서 포착
- `src/app/page.tsx` → `V3Container.tsx`: error.tsx가 이 레벨에서 포착
- `src/components/*/`: 각 차트 컴포넌트에 ErrorBoundary 래핑 필요
- `package.json`: postinstall 제거, devDependencies 이동, scripts 수정

</code_context>

<specifics>
## Specific Ideas

- Mock 데이터는 개발/데모 환경에서 계속 사용 가능해야 함 — 완전 삭제가 아닌 환경 분리
- Seed 스크립트에 환경변수 기반 데이터 소스 전환 기능 필요 (예: `SEED_SOURCE=mock|api`)
- 향후 API 호출로 실데이터 적재 가능한 구조까지 고려하여 설계

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-fixes*
*Context gathered: 2026-03-29*
