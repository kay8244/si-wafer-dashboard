# Roadmap: SI Wafer Dashboard — Code Refactoring

## Overview

이 마일스톤은 기존 대시보드의 모든 기능을 보존하면서 코드베이스를 유지보수 가능한 상태로 만드는 리팩토링이다. 순서는 기술적 의존성 그래프가 결정한다: Critical 버그를 먼저 수정하고(Phase 1), 공통 훅을 추출한 뒤(Phase 2), God Component를 분해하고(Phase 3), 테스트와 개발자 UX를 개선하고(Phase 4), 마지막으로 전체 기능 회귀를 검증한다(Phase 5). 사용자가 요청한 "가독성 → 품질 → 데이터 UX → 검증" 관심사 분리 의도를 존중하되, useAiInsight 훅 추출이 God Component 분리보다 선행해야 한다는 기술적 의존 관계를 반영해 Phase 2와 Phase 3의 순서를 확정했다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation Fixes** - Critical 버그 수정 및 빌드 오염 요소 제거 (SQLite 싱글턴, Error Boundary, postinstall/mock 정리)
- [ ] **Phase 2: Core Quality** - 중복 제거, 에러 처리 강화, API 보안 강화 (useAiInsight 훅 추출이 핵심)
- [ ] **Phase 3: Readability — God Component Decomposition** - 1000줄+ 컴포넌트를 단일 책임 단위로 분해
- [ ] **Phase 4: Tests + Developer UX** - 핵심 로직 안전망 테스트 추가 및 데이터 적재 CLI 개선
- [ ] **Phase 5: Regression Validation** - 전체 기능 회귀 확인 및 빌드 검증

## Phase Details

### Phase 1: Foundation Fixes
**Goal**: 기존 코드베이스의 Critical 버그를 수정하고, 빌드 오염 요소를 제거하여 이후 모든 리팩토링이 안전하게 진행될 수 있는 기반을 만든다
**Depends on**: Nothing (first phase)
**Requirements**: FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-05, FOUN-06
**Success Criteria** (what must be TRUE):
  1. `npm install` 실행 시 데이터베이스 시딩이 자동으로 실행되지 않는다
  2. SQLite DB 연결이 요청마다 새로 열리지 않고 모듈 레벨 싱글턴으로 유지된다 (`lsof | grep dashboard.db`로 확인)
  3. 차트 컴포넌트 렌더링 에러 발생 시 전체 앱이 흰 화면이 되지 않고 에러 경계 UI가 표시된다
  4. `src/data/*-mock.ts` 파일이 삭제되거나 테스트 픽스처로 이동되어 프로덕션 번들에서 제거된다
  5. `npm run build`가 성공하고 `@types/*`, `eslint` 관련 패키지가 devDependencies에 올바르게 분류된다
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — SQLite singleton fix, postinstall removal, devDependencies reclassification
- [x] 01-02-PLAN.md — Error boundaries (error.tsx, global-error.tsx, ChartErrorBoundary + 12 chart wrapping)
- [ ] 01-03-PLAN.md — Mock data relocation from src/data/ to tests/fixtures/

### Phase 2: Core Quality
**Goal**: AI Insight 페칭 중복을 단일 훅으로 통합하고, API 엔드포인트에 입력 검증과 Rate Limiting을 추가하여 코드 품질과 보안을 개선한다
**Depends on**: Phase 1
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07
**Success Criteria** (what must be TRUE):
  1. `useAiInsight` 훅 하나에서 AI insight 페칭이 이루어지고, 세 컴포넌트에 존재하던 중복 로직이 제거된다
  2. 코드베이스 전체에서 `eslint-disable react-hooks/exhaustive-deps` 억제가 0개가 된다
  3. `/api/ai-insight`, `/api/transcript`, `/api/news`에 잘못된 형식의 요청을 보내면 Zod 스키마 검증 에러로 400 응답이 반환된다
  4. 동일 IP에서 짧은 시간 내 반복 요청 시 Rate Limiting에 의해 429 응답이 반환된다
  5. `catch` 블록이 silent fail하지 않고 구조화된 `console.error`로 에러 정보를 출력한다
**Plans**: TBD

### Phase 3: Readability — God Component Decomposition
**Goal**: 1000줄 이상의 God Component를 로직 훅, 서브 컴포넌트, 얇은 컨테이너의 3계층으로 분해하여 각 파일이 단일 책임을 갖도록 한다
**Depends on**: Phase 2
**Requirements**: READ-01, READ-02, READ-03, READ-04, READ-05
**Success Criteria** (what must be TRUE):
  1. `ExternalComparison.tsx`, `DemandBarChart.tsx`, `MonthlyMetricsChart.tsx`, `VcmPage.tsx`, `IndicatorChart.tsx` 각 파일이 200줄 이하로 줄어든다
  2. 분리된 서브 컴포넌트들이 다크모드에서 올바르게 렌더링된다 (`.dark` 클래스 기반, `dark:` Tailwind prefix 없음)
  3. `useDarkMode()` 훅이 최상위 페이지 컴포넌트에서만 호출되고, 서브 컴포넌트는 `isDark: boolean` prop을 받는다
  4. 분해 후 모든 탭(Supply Chain, VCM, Customer Detail)이 데이터를 정상적으로 표시한다
**Plans**: TBD
**UI hint**: yes

### Phase 4: Tests + Developer UX
**Goal**: DB 레이어, API 재구성 로직, 데이터 변환 유틸에 대한 테스트 안전망을 추가하고, 개발자가 CLI로 실데이터를 쉽게 적재할 수 있도록 정비한다
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03, DEVX-01, DEVX-02, DEVX-03
**Success Criteria** (what must be TRUE):
  1. `npm run test`가 통과하고 DB 레이어 핵심 함수(`queryMetrics`, `queryAll` 등)가 in-memory SQLite로 테스트된다
  2. VCM EAV 재구성 로직과 `buildCustomerExecutive()` 함수에 대한 테스트가 존재하고 통과한다
  3. `npm run seed` 실행 시 진행 상황과 에러가 명확하게 출력되고, `--clear` 플래그로 데이터 초기화가 가능하다
  4. `scripts/SEEDING.md`를 읽으면 개발자가 실데이터를 적재하는 전체 절차를 이해할 수 있다
  5. `data/templates/`의 CSV 템플릿 파일에 사용법 주석이 포함되어 있다
**Plans**: TBD

### Phase 5: Regression Validation
**Goal**: 모든 리팩토링 완료 후 기존 기능이 100% 보존되었음을 확인하고, 프로덕션 빌드가 성공함을 검증한다
**Depends on**: Phase 4
**Requirements**: REGR-01, REGR-02, REGR-03
**Success Criteria** (what must be TRUE):
  1. `npm run build`가 타입 에러, 빌드 에러 없이 성공한다
  2. 모든 API 라우트(`/api/supply-chain`, `/api/vcm`, `/api/customer-detail`, `/api/ai-insight`, `/api/transcript`, `/api/news`)의 응답 JSON 구조가 리팩토링 전후 동일하다
  3. 다크모드 토글 시 Supply Chain, VCM, Customer Detail 모든 탭의 컴포넌트가 올바르게 스타일을 전환한다
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Fixes | 0/3 | Planned | - |
| 2. Core Quality | 0/TBD | Not started | - |
| 3. Readability — God Component Decomposition | 0/TBD | Not started | - |
| 4. Tests + Developer UX | 0/TBD | Not started | - |
| 5. Regression Validation | 0/TBD | Not started | - |
