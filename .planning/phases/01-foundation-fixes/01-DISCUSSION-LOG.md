# Phase 1: Foundation Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-foundation-fixes
**Areas discussed:** 에러 바운더리 전략, Mock 데이터 처리, Seed 스크립트 전략

---

## 에러 바운더리 전략

### Q1: 차트 에러 바운더리 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 차트 개별 래핑 | 각 Recharts 컴포넌트마다 에러 바운더리 적용. 하나가 깨져도 나머지 정상 표시. | ✓ |
| 탭 페이지 단위 래핑 | SupplyChainPage / VcmPage / CustomerDetailPage 각각 하나의 에러 바운더리. 해당 탭 전체가 에러 UI로 대체. | |
| 섹션 단위 래핑 | 차트 영역 / 사이드바 / AI 인사이트 등 논리적 섹션별로 바운더리 설정. | |

**User's choice:** 차트 개별 래핑
**Notes:** 하나의 차트 에러가 다른 차트에 영향을 주지 않는 격리 방식 선호.

### Q2: 폴백 UI 디자인

| Option | Description | Selected |
|--------|-------------|----------|
| 간결한 에러 메시지 | 한 줄 메시지 + 재시도 버튼. 상세는 console.error. | ✓ |
| 에러 상세 포함 | 에러 메시지 텍스트를 UI에 직접 표시 + 재시도 버튼. | |
| 빈 영역 + 툴팁 | 회색 빈 박스, hover 시 에러 정보 툴팁. | |

**User's choice:** 간결한 에러 메시지
**Notes:** 내부 도구이므로 최소한의 안내로 충분. 에러 상세는 콘솔로.

### Q3: error.tsx 범위

| Option | Description | Selected |
|--------|-------------|----------|
| error.tsx + global-error.tsx 모두 | 페이지 레벨 + root layout 레벨 모두 포착 | ✓ |
| error.tsx만 | 페이지 레벨 에러만 포착 | |

**User's choice:** error.tsx + global-error.tsx 모두
**Notes:** 모든 수준의 에러를 커버하는 완전한 에러 바운더리 전략.

---

## Mock 데이터 처리

**User's choice (free text):** Mock 데이터는 삭제하지 않고 테스트 픽스처로 이동. 개발/데모 환경에서는 mock을 쓰고, 실환경에서는 API로 전환할 수 있는 구조.
**Notes:** AskUserQuestion 대신 사용자가 직접 결정을 제공함.

---

## Seed 스크립트 전략

**User's choice (free text):** Seed 스크립트는 mock 기반을 유지하되, 환경변수로 mock vs 실DB를 전환할 수 있게 구성. 나중에 API 호출로 실데이터를 적재할 수 있는 구조 설계.
**Notes:** AskUserQuestion 대신 사용자가 직접 결정을 제공함.

---

## Claude's Discretion

- SQLite 싱글턴 구현 방식 (모듈 레벨 변수, graceful shutdown)
- devDependencies 이동 대상 패키지 선별
- ErrorBoundary 컴포넌트 구현 패턴 선택
- Mock 파일 이동 목적지 디렉토리 구조

## Deferred Ideas

None
