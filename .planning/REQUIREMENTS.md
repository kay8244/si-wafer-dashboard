# Requirements: SI Wafer Dashboard — Code Refactoring

**Defined:** 2026-03-29
**Core Value:** 기존 대시보드 기능을 깨뜨리지 않으면서 코드베이스를 유지보수 가능하고 이해하기 쉬운 상태로 만든다.

## v1 Requirements

### Foundation (기반 수정)

- [ ] **FOUN-01**: SQLite 싱글턴 커넥션 패턴 적용 — getSqliteDb()를 모듈 레벨 싱글턴으로 변경, 모든 query 함수에서 db.close() 제거
- [ ] **FOUN-02**: Next.js App Router error.tsx 추가 — src/app/error.tsx, global-error.tsx 생성으로 페이지 레벨 에러 포착
- [ ] **FOUN-03**: 차트 컴포넌트 에러 바운더리 래핑 — Recharts 렌더링 에러가 전체 앱을 크래시하지 않도록 개별 차트 보호
- [ ] **FOUN-04**: postinstall 훅 제거 — npm install 시 자동 seed 실행 제거, npm run seed를 명시적 수동 실행으로 변경
- [ ] **FOUN-05**: mock 데이터 파일 정리 — src/data/*-mock.ts (~2400줄) 사용 여부 확인 후 제거 또는 테스트 픽스처로 이동
- [ ] **FOUN-06**: devDependencies 분류 수정 — @types/*, eslint 관련 패키지를 dependencies에서 devDependencies로 이동

### Quality (코드 품질)

- [ ] **QUAL-01**: useAiInsight 공통 훅 추출 — IndicatorChart, ExternalComparison, DemandBarChart 3곳의 중복 AI insight 페칭 로직을 src/hooks/useAiInsight.ts로 통합
- [ ] **QUAL-02**: AiInsightPanel 공통 컴포넌트 추출 — AI 인사이트 표시 UI를 재사용 가능한 컴포넌트로 분리
- [ ] **QUAL-03**: API 라우트 Zod v4 입력 검증 추가 — /api/ai-insight, /api/transcript, /api/news 엔드포인트에 스키마 기반 검증
- [ ] **QUAL-04**: 빈 catch 블록 에러 로깅 강화 — cache.ts(4곳), transcript route(3곳), supply-chain route(3곳), db.ts(4곳)의 silent catch를 구조화된 console.error로 교체
- [ ] **QUAL-05**: in-memory Rate Limiting 추가 — /api/ai-insight, /api/transcript, /api/news에 프로세스 레벨 토큰 버킷 적용
- [ ] **QUAL-06**: 기본 인증 미들웨어 추가 — src/proxy.ts (Next.js 16.1)에 IP 허용목록 또는 Basic Auth로 API 라우트 보호
- [ ] **QUAL-07**: eslint-disable react-hooks/exhaustive-deps 제거 — useAiInsight 훅 추출 후 4개 suppression 모두 제거

### Readability (가독성)

- [ ] **READ-01**: ExternalComparison.tsx 분리 (1254줄) — 데이터 변환, 차트 렌더링, AI 인사이트를 독립 컴포넌트로 분해
- [ ] **READ-02**: MonthlyMetricsChart.tsx 분리 (799줄) — 차트 설정, 데이터 처리, 렌더링 분리
- [ ] **READ-03**: DemandBarChart.tsx 분리 (718줄) — 차트 데이터 구성과 렌더링 분리
- [ ] **READ-04**: VcmPage.tsx 정리 (678줄) — 섹션별 하위 컴포넌트 추출
- [ ] **READ-05**: IndicatorChart.tsx 정리 (555줄) — AI 인사이트 분리 후 차트 로직 정리

### Testing (테스트)

- [ ] **TEST-01**: DB 레이어 테스트 — in-memory SQLite로 queryMetrics, queryAll, queryMetricsLike 등 핵심 함수 테스트
- [ ] **TEST-02**: API 라우트 핵심 로직 테스트 — VCM MetricRow→VcmData 재구성, customer-detail buildCustomerExecutive 함수
- [ ] **TEST-03**: 데이터 변환 유틸 테스트 — format.ts 기존 테스트 보강 + chart-utils.ts, news-utils.tsx 테스트 추가

### Developer UX (개발자 경험)

- [ ] **DEVX-01**: npm run seed / seed:clear CLI 정비 — 환경 플래그, 에러 메시지, 진행 표시 개선
- [ ] **DEVX-02**: 데이터 적재 가이드 작성 — scripts/SEEDING.md에 실데이터 적재 절차 문서화
- [ ] **DEVX-03**: CSV 템플릿 및 예시 데이터 정비 — data/templates/ 파일 검증, 사용법 주석 추가

### Regression (회귀 검증)

- [ ] **REGR-01**: 전체 빌드 성공 확인 — npm run build 제로 에러
- [ ] **REGR-02**: 기존 API 응답 형태 보존 — 모든 API 라우트의 응답 JSON 구조 변경 없음 확인
- [ ] **REGR-03**: 다크모드 동작 확인 — 컴포넌트 분리 후 dark mode CSS 특이성 문제 없음 검증

## v2 Requirements

### Infrastructure (인프라)

- **INFR-01**: Vercel KV/Upstash Redis 캐시 도입 — 서버리스 환경에서 파일 캐시 대체
- **INFR-02**: API 응답 페이지네이션 — customer-detail, vcm, supply-chain 대용량 응답 분할
- **INFR-03**: URL 기반 탭 라우팅 — 딥링크 지원, 브라우저 뒤로가기 동작

### Observability (관측성)

- **OBSV-01**: 구조화된 로깅 프레임워크 도입
- **OBSV-02**: Sentry 에러 트래킹 연동
- **OBSV-03**: API 비용 트래킹 (Anthropic/Tavily 사용량 모니터링)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 새 대시보드 기능 추가 | 리팩토링 전용 프로젝트 |
| 비개발자용 데이터 업로드 웹 UI | 대상 사용자가 개발자(CLI) |
| React Query/SWR 클라이언트 캐싱 도입 | 아키텍처 변경은 범위 밖 |
| 접근성(a11y) 개선 | 내부 도구이므로 별도 마일스톤 |
| 국제화(i18n) | 한국어 전용 대시보드 |
| Upstash Redis Rate Limiting | 내부 도구에 in-memory로 충분 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUN-01 | — | Pending |
| FOUN-02 | — | Pending |
| FOUN-03 | — | Pending |
| FOUN-04 | — | Pending |
| FOUN-05 | — | Pending |
| FOUN-06 | — | Pending |
| QUAL-01 | — | Pending |
| QUAL-02 | — | Pending |
| QUAL-03 | — | Pending |
| QUAL-04 | — | Pending |
| QUAL-05 | — | Pending |
| QUAL-06 | — | Pending |
| QUAL-07 | — | Pending |
| READ-01 | — | Pending |
| READ-02 | — | Pending |
| READ-03 | — | Pending |
| READ-04 | — | Pending |
| READ-05 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| DEVX-01 | — | Pending |
| DEVX-02 | — | Pending |
| DEVX-03 | — | Pending |
| REGR-01 | — | Pending |
| REGR-02 | — | Pending |
| REGR-03 | — | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 0
- Unmapped: 27 ⚠️

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after initial definition*
