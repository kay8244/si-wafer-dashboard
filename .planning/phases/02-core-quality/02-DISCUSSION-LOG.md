# Phase 2: Core Quality - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 02-core-quality
**Areas discussed:** useAiInsight 훅 설계, API 보안 전략, Zod 검증 범위, 에러 로깅 전략

---

## useAiInsight 훅 설계

### Q1: 훅이 담당할 범위

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch/State만 추출 | 훅은 state + fetch + auto-refetch만 담당, context 빌드는 컴포넌트에 남김 | ✓ |
| Context 빌드까지 훅 내부로 | 훅이 tab 타입에 따라 context 빌드 로직까지 내장 | |
| Claude 재량 | 코드 분석 후 최적 경계 결정 | |

**User's choice:** Fetch/State만 추출 (Recommended)
**Notes:** None

### Q2: auto-refetch 패턴 포함 여부

| Option | Description | Selected |
|--------|-------------|----------|
| deps 기반 auto-refetch 포함 | 훅이 deps 배열을 받아 변경 시 자동 refetch. eslint-disable 3개 제거 가능 | ✓ |
| auto-refetch는 컴포넌트에 남김 | 훅은 순수하게 fetch/state만 | |

**User's choice:** deps 기반 auto-refetch 포함 (Recommended)
**Notes:** None

### Q3: AiInsightPanel UI 컴포넌트 추출 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 훅과 함께 추출 | useAiInsight + AiInsightPanel을 한 세트로 | ✓ |
| Phase 3에서 처리 | God Component 분해 시 함께 | |
| Claude 재량 | 자연스러운 시점에 추출 | |

**User's choice:** 훅과 함께 추출 (Recommended)
**Notes:** None

---

## API 보안 전략

### Q1: 인증 방식

| Option | Description | Selected |
|--------|-------------|----------|
| Basic Auth | 환경변수로 아이디/비밀번호 설정, 내부 도구에 적합 | ✓ |
| API Key 헤더 | x-api-key 헤더로 인증, 프로그래매틱 | |
| 외부 API만 보호 | Anthropic/Tavily 호출 3개만 보호, 데이터 조회는 공개 | |
| Claude 재량 | 내부 도구 특성과 Vercel 환경 고려해 결정 | |

**User's choice:** Basic Auth (Recommended)
**Notes:** None

### Q2: Rate Limiting 적용 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 비용 발생 API만 | ai-insight, transcript, news 3개만 | ✓ |
| 전체 API 라우트 | 6개 전체에 적용 | |
| Claude 재량 | 비용/리스크 분석 후 결정 | |

**User's choice:** 비용 발생 API만 (Recommended)
**Notes:** None

### Q3: 구현 위치

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js middleware | src/middleware.ts에 통합 구현, matcher로 대상 선별 | ✓ |
| 각 라우트에 직접 | 각 API route.ts에 개별 코드 추가 | |
| Claude 재량 | 코드베이스 구조와 Next.js 16.1 특성 고려 | |

**User's choice:** Next.js middleware (Recommended)
**Notes:** None

---

## Zod 검증 범위

### Q1: 적용 대상 엔드포인트

| Option | Description | Selected |
|--------|-------------|----------|
| QUAL-03 명시만 | ai-insight, transcript, news 3개만 | ✓ |
| 전체 API 6개 | 데이터 조회 API query param도 검증 | |
| Claude 재량 | 입력 복잡도 분석 후 필요한 곳만 | |

**User's choice:** QUAL-03 명시만 (Recommended)
**Notes:** None

### Q2: 검증 엄격도

| Option | Description | Selected |
|--------|-------------|----------|
| 타입 + 길이 제한 | tab: string max(50), context: string max(10000) 등 | ✓ |
| 타입만 검사 | string/number 타입 일치 여부만, 길이 제한 없음 | |
| Claude 재량 | 엔드포인트별 입력 특성에 맞춰 결정 | |

**User's choice:** 타입 + 길이 제한 (Recommended)
**Notes:** None

---

## 에러 로깅 전략

### Q1: silent catch 처리 방침

| Option | Description | Selected |
|--------|-------------|----------|
| 전수 console.error 추가 | 모든 silent catch에 구조화된 로깅 추가 | ✓ |
| 위험도 기반 차등 적용 | DB=error, 캐시=warn, 파일I/O=무시 유지 | |
| Claude 재량 | 각 catch의 맥락 분석 후 적절한 레벨 결정 | |

**User's choice:** 전수 console.error 추가 (Recommended)
**Notes:** None

### Q2: 로깅 포맷

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 패턴 유지 | console.error('[tag] description:', err) 형식 | ✓ |
| 구조화 JSON 로깅 | JSON.stringify({ tag, message, error, timestamp }) | |
| Claude 재량 | 기존 패턴과 운영 필요성 고려 | |

**User's choice:** 기존 패턴 유지 (Recommended)
**Notes:** None

---

## Claude's Discretion

- useAiInsight 훅 내부 구현 (useRef 관리, AbortController 등)
- AiInsightPanel Props 인터페이스 설계
- Rate Limiting 토큰 버킷 수치
- Basic Auth 환경변수 네이밍
- Zod 스키마 필드별 구체적 제약조건
- SupplyChainPage.tsx의 4번째 eslint-disable 처리

## Deferred Ideas

None — discussion stayed within phase scope
