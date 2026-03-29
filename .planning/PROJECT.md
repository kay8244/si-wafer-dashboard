# SI Wafer Dashboard — Code Refactoring

## What This Is

실트론 MI플랫폼 현황판(SI Wafer Dashboard)의 코드 리팩토링 프로젝트. Next.js 16.1 + React 19 기반의 반도체 시장 인텔리전스 대시보드로, Supply Chain / VCM / Customer Detail 3개 탭으로 구성되어 있다. 기존 기능을 100% 유지하면서 코드 가독성, 품질, 데이터 적재 편의성을 개선하는 것이 목표다.

## Core Value

기존 대시보드 기능을 깨뜨리지 않으면서 코드베이스를 유지보수 가능하고 이해하기 쉬운 상태로 만든다.

## Requirements

### Validated

<!-- 이미 동작하는 기존 기능 -->

- ✓ Supply Chain 탭: 지표 차트, 내부 데이터, AI 인사이트 — existing
- ✓ VCM 탭: 수요 바 차트, WFE 데이터, 버전 비교 — existing
- ✓ Customer Detail 탭: 고객별 상세, 외부 비교, 뉴스, Transcript — existing
- ✓ 듀얼 DB 지원: SQLite(로컬) / Postgres(Vercel) 자동 전환 — existing
- ✓ AI 통합: Anthropic Claude 기반 데이터 인사이트, 뉴스 요약, Transcript 분석 — existing
- ✓ 다크모드: localStorage 기반 테마 토글 — existing
- ✓ 캐싱: 파일 + 메모리 + DB 3중 캐시 (24시간 TTL) — existing
- ✓ Vercel 배포: 서버리스 환경 프로덕션 배포 — existing

### Active

<!-- 이번 리팩토링에서 달성할 목표 -->

- [ ] 코드 가독성 향상: 네이밍 통일, 주석 정리, 파일/폴더 구조 개선
- [ ] 코드 품질 개선: 중복 제거, 에러 처리 강화, 타입 안전성 강화
- [ ] Critical 버그 수정: SQLite 커넥션 릭, Error Boundary 추가, Rate Limiting, 인증
- [ ] 대형 컴포넌트 분리: 1000줄+ God Component를 단일 책임 컴포넌트로 분리
- [ ] 중복 패턴 통합: AI Insight 페칭 로직 등 3곳 중복을 공통 훅으로 추출
- [ ] 핵심 로직 테스트 추가: DB 레이어, API 라우트, 데이터 변환 로직
- [ ] 데이터 적재 UX 개선: 개발자가 CLI로 실데이터를 쉽게 적재할 수 있도록 문서화, 설정, 예시 정비
- [ ] 기존 기능 regression 없음 확인

### Out of Scope

- 새로운 대시보드 기능 추가 — 리팩토링 전용 프로젝트
- 비개발자용 웹 UI 데이터 업로드 — 대상 사용자가 개발자(CLI)
- URL 기반 탭 라우팅 변경 — 기능 변경에 해당
- React Query/SWR 도입 — 클라이언트 캐싱 아키텍처 변경은 범위 밖
- 접근성(a11y) 개선 — 내부 도구이므로 별도 마일스톤으로
- 국제화(i18n) — 한국어 전용 대시보드

## Context

- 약 14,000줄의 TypeScript 코드베이스 (컴포넌트 30개, API 라우트 6개)
- 테스트 커버리지 거의 없음 (format 유틸리티 1파일만 존재)
- God Component 다수: ExternalComparison(1254줄), MonthlyMetricsChart(799줄), DemandBarChart(718줄)
- AI Insight 페칭 로직이 3개 컴포넌트에서 중복
- SQLite 커넥션이 요청마다 새로 열리고 닫히지 않는 Critical 버그
- API 라우트에 인증/Rate Limiting 없음
- 파일 캐시가 Vercel 서버리스에서 무의미 (ephemeral filesystem)
- mock 데이터 파일(~2400줄)이 아직 남아있음
- 코드베이스 분석 완료: `.planning/codebase/` 참조

## Constraints

- **Tech stack**: Next.js 16.1 / React 19 / Recharts 3.7 / Tailwind 4.1 / TypeScript 5.9 유지
- **기능 보존**: 모든 기존 기능이 리팩토링 후에도 동일하게 동작해야 함
- **배포 환경**: Vercel 서버리스 + Vercel Postgres 유지
- **빌드 검증**: 모든 변경 후 `npm run build` 성공 필수
- **데이터 적재 대상**: 개발자 (CLI 사용 가능한 사용자)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 기존 기능 변경 없이 리팩토링만 수행 | 안정성 우선, regression 리스크 최소화 | — Pending |
| Critical 이슈(CC-1~CC-4) 이번 범위에 포함 | 코드 품질 개선 목표에 부합 | — Pending |
| God Component 분리 포함 | 가독성 개선의 핵심 작업 | — Pending |
| 테스트는 핵심 로직만 추가 | 전체 커버리지보다 safety net 우선 | — Pending |
| 데이터 적재 대상은 개발자(CLI) | 비개발자 UI는 Out of Scope | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after initialization*
