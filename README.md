# 실트론 MI플랫폼 현황판

실트론 시장정보(MI) 플랫폼 — 전방시장 지표, 웨이퍼 수요예측(VCM), 고객별 상세 분석을 시각화합니다.

## 기술 스택

| 항목 | 버전 |
|------|------|
| Next.js (App Router) | 16.1 |
| React | 19 |
| Recharts | 3.7 |
| Tailwind CSS | 4.1 |
| TypeScript | 5.9 |
| SQLite (better-sqlite3) | 로컬/사내용 |
| PostgreSQL (Neon) | Vercel 배포용 |

## 환경 변수 (.env.local)

```
ANTHROPIC_API_KEY=      # Anthropic API 키 (뉴스 AI 요약 + AI 데이터분석용)
TAVILY_API_KEY=         # Tavily API 키 (뉴스 검색용, 선택)

# Postgres 사용 시 (선택 — 없으면 SQLite 자동 사용)
POSTGRES_URL=           # Neon/Vercel Postgres 연결 URL
DATABASE_URL=           # 또는 이것
```

## 실행

```bash
npm install
npm run seed             # SQLite DB 생성 (data/dashboard.db, 18,141 rows)
npm run dev              # http://localhost:3000
npm run build            # 프로덕션 빌드 (에러 검증용)
npm test                 # 유닛 테스트 실행 (vitest)
npm run test:watch       # 테스트 watch 모드
```

> **DB 선택**: `.env.local`에 `POSTGRES_URL` 또는 `DATABASE_URL`이 있으면 Postgres, 없으면 SQLite를 사용합니다.
> **Vercel 배포 시**: `ANTHROPIC_API_KEY`를 Vercel 환경변수에도 등록해야 AI 데이터분석/뉴스 요약이 동작합니다.

---

## 라우트 구조

```
/                              <- 현황판 (메인)
+-- 탭1: 전방시장               -> SupplyChainPage
|   +-- 기존 지표 (Macro/Application/Semiconductor/Equipment/Wafer)
|   +-- Application > Server 선행지표 (서브탭)
|   +-- Semiconductor > Memory Price (서브탭)
+-- 탭2: VCM (수요예측)         -> VcmPage
+-- 탭3: 고객별                 -> CustomerDetailPage
    +-- 메모리 (SEC, SKHY, Micron, Koxia)
    +-- 파운드리 (SEC, TSMC, SMIC, GFs, STM, Intel)
        +-- Foundry 노드별 가동률 차트

API 라우트:
+-- GET /api/supply-chain      <- 전방시장 + Foundry 노드 + Server 선행지표 + Memory Price
+-- GET /api/vcm               <- VCM 수요예측 데이터 (시장 + 내부 전망)
+-- GET /api/customer-detail   <- 고객별 상세 데이터
+-- GET /api/news              <- AI 뉴스 요약
+-- POST /api/transcript       <- Earnings Transcript AI 요약
+-- POST /api/ai-insight       <- AI 데이터분석 (지표 추세/상관관계 해석)
```

---

## 현황판 데이터 흐름

```
+-----------------+     +----------------------+     +-------------------------+
|  DB             |     |  API Routes          |     |  React Hooks + 컴포넌트 |
|  (SQLite 또는   |---->|  /api/supply-chain     |---->|  useSupplyChainData()   |
|   Postgres)     |     |  /api/vcm            |---->|  useVcmData()           |
|                 |     |  /api/customer-detail |---->|  useCustomerDetailData()|
|  metrics 테이블 |     |  /api/news           |---->|  useNews()              |
|  (Long-form)    |     |  /api/transcript     |---->|  TranscriptSummary      |
+-----------------+     +----------------------+     +-------------------------+
```

**모든 데이터가 DB -> API -> Hook -> 컴포넌트** 순으로 전달됩니다.
`src/data/*-mock.ts` 파일들은 **seed 스크립트에서만** 사용되며, 컴포넌트가 직접 import하지 않습니다.

---

## DB 구조

모든 데이터는 단일 `metrics` 테이블에 **Long-form**으로 저장됩니다.

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `tab` | TEXT | 대시보드 탭 구분 | `supply-chain`, `vcm`, `customer-detail` |
| `date` | TEXT | 기간 | `2025-01`, `Q2'24`, `_meta` |
| `customer` | TEXT | 엔티티명 | `OECD CLI`, `SEC`, `TSMC_7n` |
| `category` | TEXT | 메트릭 분류 | `actual`, `foundry_node`, `server_indicator` |
| `value` | REAL | 숫자 값 | `100.47` |
| `unit` | TEXT | 단위 | `Index`, `K/M`, `%`, `$` |
| `is_estimate` | INTEGER | 추정치 여부 (0/1) | `0` = 확정, `1` = 추정 |
| `version` | TEXT | 데이터 버전/표시명 | `current`, `previous`, `SEC`, `8GB DDR4 DIMM (PC)` |
| `metadata` | TEXT | 추가 정보 (JSON) | `{"categoryId":"macro"}` |

---

## 실데이터 적재 가이드

### 1. 전방시장 외부 지표 (`tab = 'supply-chain'`)

5개 카테고리: Macro(M), Application(A), Semiconductor(S), Equipment(E), Wafer(W)

#### 1-1. 지표 메타데이터

```sql
-- 각 지표의 메타 정보 (카테고리, 이름, 단위, 판정, 선행성 등)
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, version, metadata)
VALUES (
  'supply-chain',
  '_meta',                    -- 메타 행은 date='_meta'
  'OECD CLI',                 -- customer = 지표명 (고유 ID 역할)
  'indicatorMeta',            -- category 고정
  NULL,
  'Index',                    -- unit
  0,
  NULL,
  '{"categoryId":"macro","indicatorId":"A","name":"OECD CLI","unit":"Index","judgment":"경기선행지수 100 회복","leadingRating":"상","ratingReason":"반도체 수요와 6~9개월 선행"}'
);
```

**metadata JSON 필드:**

| 필드 | 설명 | 예시 |
|------|------|------|
| `categoryId` | 카테고리 | `macro`, `application`, `semiconductor`, `equipment`, `wafer` |
| `indicatorId` | 카테고리 내 순서 | `A`, `B`, `C` |
| `name` | 지표 표시명 | `OECD CLI` |
| `unit` | 단위 | `Index`, `$B`, `M units`, `%` |
| `judgment` | 반기 판정 코멘트 | `OECD 경기선행지수 100 회복...` |
| `leadingRating` | 선행성 등급 | `상`, `중상`, `중`, `중하`, `하` |
| `ratingReason` | 선행성 이유 | `경기선행지수는 반도체 수요와...` |

#### 1-2. 월별 시계열 데이터

각 지표에 대해 5가지 뷰 모드(actual, threeMonthMA, twelveMonthMA, mom, yoy)별로 행을 추가합니다.

```sql
-- Actual 값
INSERT INTO metrics (tab, date, customer, category, value, unit)
VALUES ('supply-chain', '2025-03', 'OECD CLI', 'actual', 100.47, 'Index');

-- 3개월 이동평균
INSERT INTO metrics (tab, date, customer, category, value, unit)
VALUES ('supply-chain', '2025-03', 'OECD CLI', 'threeMonthMA', 100.35, 'Index');

-- 12개월 이동평균
INSERT INTO metrics (tab, date, customer, category, value, unit)
VALUES ('supply-chain', '2025-03', 'OECD CLI', 'twelveMonthMA', 100.22, 'Index');

-- MoM (전월비 %)
INSERT INTO metrics (tab, date, customer, category, value, unit)
VALUES ('supply-chain', '2025-03', 'OECD CLI', 'mom', 0.3, '%');

-- YoY (전년비 %)
INSERT INTO metrics (tab, date, customer, category, value, unit)
VALUES ('supply-chain', '2025-03', 'OECD CLI', 'yoy', 1.2, '%');
```

> 36개월 x 5뷰 x 지표 수 = 총 행 수. 예: 18개 지표 x 36개월 x 5뷰 = 3,240행

#### 1-3. 내부 데이터 오버레이 (CAPA/투입량/가동률)

메모리/파운드리 업체별 내부 데이터:

```sql
-- SEC CAPA (K/M)
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES ('supply-chain', '2025-03', 'SEC', 'internal_capa', 11855, 'K/M', 'SEC');

-- SEC 투입량 (K/M) — CAPA와 비슷한 수준 (가동률 = 투입량/CAPA)
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES ('supply-chain', '2025-03', 'SEC', 'internal_waferInput', 10630, 'K/M', 'SEC');

-- SEC 가동률 (%)
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES ('supply-chain', '2025-03', 'SEC', 'internal_utilization', 89, '%', 'SEC');
```

**회사 목록**: SEC, SK Hynix, Micron (메모리) / SEC, TSMC, SMIC, GFs (파운드리)

**오버레이 색상**:
```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES ('supply-chain', '_meta', 'SEC', 'overlayColor', NULL, NULL, '#f59e0b');
```

### 2. Foundry 노드별 가동률 (`tab = 'supply-chain'`, `category = 'foundry_node'`)

TSMC/UMC 노드별 투입량과 CAPA. 가동률은 프론트엔드에서 계산 (투입량/CAPA*100).

```sql
-- TSMC 7nm 노드 데이터
INSERT INTO metrics (tab, date, customer, category, value, unit, version, metadata)
VALUES (
  'supply-chain',
  '2025-03',
  'TSMC_7n',                  -- customer = '{회사}_{노드ID}'
  'foundry_node',
  14500,                      -- value = 투입량 (waferInput)
  'K/M',
  'TSMC',                     -- version = 회사명
  '{"capa":15200,"nodeId":"7n","nodeLabel":"7nm","category":"advanced"}'
);
```

**TSMC 노드**: 90n, 45n, 28n, 12n (비선단/mature) | 7n, 5n, 3n, 2n (선단/advanced)
**UMC 노드**: 90n, 45n, 28n, 12n (비선단/mature)

**노드 색상**:
```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES ('supply-chain', '_meta', '7n', 'foundry_node_color', NULL, NULL, '#22c55e');
```

### 3. Server 선행지표 (`tab = 'supply-chain'`, `category = 'server_indicator'`)

12MMA YoY (%) 값. 계층 구조는 metadata JSON으로 표현.

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version, metadata)
VALUES (
  'supply-chain',
  '2025-03',
  'wistron',                  -- customer = 지표 ID
  'server_indicator',
  -4.2,                       -- value = 12MMA YoY (%)
  '%',
  'Wistron',                  -- version = 표시명
  '{"group":"서버 공급자","subGroup":"서버\nODM","company":"Wistron"}'
);
```

**지표 목록:**

| ID | group | subGroup | company |
|----|-------|----------|---------|
| `srv_sales` | 서버판매량 | (없음) | (없음) |
| `dc_construction` | 서버 구매자 투자 | 미 Data Center | DC 건설지출 |
| `dc_power` | 서버 구매자 투자 | 미 Data Center | DC 집중지역 전력 소비량 |
| `wistron` | 서버 공급자 | 서버 ODM | Wistron |
| `wlwynn` | 서버 공급자 | 서버 ODM | Wlwynn |
| `quanta` | 서버 공급자 | 서버 ODM | Quanta |
| `inventec` | 서버 공급자 | 서버 ODM | Inventec |
| `kinsus` | 핵심 부품 공급자 | ABF | Kinsus |
| `unimicron` | 핵심 부품 공급자 | ABF | Unimicron |
| `isupt` | 핵심 부품 공급자 | MLB | 이수페타시스 |
| `doosan` | 핵심 부품 공급자 | CCL | 두산 |
| `tw3` | 핵심 부품 공급자 | CCL | 대만 3사 |
| `aspeed` | 핵심 부품 공급자 | BMC | Aspeed |
| `avc` | 핵심 부품 공급자 | Cooling | AVC |

### 4. Memory Price (`tab = 'supply-chain'`, `category = 'memory_price'`)

메모리 가격 데이터 (USD).

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version)
VALUES (
  'supply-chain',
  '2025-03',
  'ddr4_8g_pc',               -- customer = 지표 ID
  'memory_price',
  1.65,                       -- value = 가격 (USD)
  '$',
  '8GB DDR4 DIMM (PC)'        -- version = 표시명
);
```

**지표 목록:**

| ID | 표시명 |
|----|--------|
| `ddr4_8g_pc` | 8GB DDR4 DIMM (PC) |
| `ddr4_16g_pc` | 16GB DDR4 DIMM (PC) |
| `ddr4_32g_srv` | 32GB DDR4 RDIMM (SERVER) |
| `lpddr4_8g` | 8GB LPDDR4 (SMP) |
| `lpddr4_12g` | 12GB LPDDR4 (SMP) |
| `ddr5_16g` | 16GB DDR5 DIMM |
| `ddr5_64g` | 64GB DDR5 RDIMM |
| `ddr5_96g_srv` | 96GB DDR5 RDIMM (SERVER) |
| `ddr5_128g_srv` | 128GB DDR5 RDIMM (SERVER) |
| `ddr5_256g_srv` | 256GB DDR5 RDIMM (SERVER) |
| `lpddr5_8g` | 8GB LPDDR5 (SMP) |
| `lpddr5_12g` | 12GB LPDDR5 (SMP) |
| `nand_256g_tlc` | NAND Price 256Gb TLC Wafer |
| `nand_512g_tlc` | NAND Price 512Gb TLC Wafer |
| `nand_1t_qlc` | NAND Price 1Tb QLC Wafer |

### 5. 고객별 데이터 (`tab = 'customer-detail'`)

상세 적재 방법은 **[DATA_GUIDE.md](./DATA_GUIDE.md)**를 참고하세요.

**주요 category 값:**

| category | 설명 | value 단위 |
|----------|------|-----------|
| `monthly_waferInput` | 월별 투입량 | Km2 |
| `monthly_purchaseVolume` | 월별 구매량 | Km2 |
| `monthly_capa` | 월별 생산능력 | Km2 |
| `monthly_utilization` | 월별 가동률 | % |
| `monthly_inventoryMonths` | 월별 재고월수 | 개월 |
| `financial_revenue` | 분기별 매출 | $B |
| `financial_operatingIncome` | 분기별 영업이익 | $B |
| `transcript` | Earnings Transcript AI 요약 (목업: Tavily+AI, 실데이터: DB 직접 적재) | - |
| `industry_metric` | 산업 지표 (가동률, 매출 등) | 혼합 |

### 6. VCM 데이터 (`tab = 'vcm'`)

**버전 관리**: VCM 데이터는 `version` 필드로 전망 버전을 구분합니다 (예: `2025-04`, `2025-10`). UI의 버전 셀렉트에서 전환하면 해당 버전 데이터로 자동 교체됩니다. `vcmVersion`, `newsQuery` 등 공통 메타는 `version=NULL`.

상세 적재 방법은 **[DATA_GUIDE.md](./DATA_GUIDE.md)**를 참고하세요.

---

## 데이터 적재 방법

### 목업 데이터로 초기화

```bash
# SQLite (로컬)
npm run seed                   # src/data/*-mock.ts -> data/dashboard.db (~18,141 rows, VCM 2버전 포함)

# Postgres (배포용)
npx tsx scripts/seed-postgres.ts  # 동일 데이터 -> Postgres
```

### 실데이터 적재

```bash
# 방법 1: SQL 직접 입력
sqlite3 data/dashboard.db "INSERT INTO metrics (...) VALUES (...)"

# 방법 2: CSV import
sqlite3 data/dashboard.db ".mode csv" ".import data/real-data.csv metrics"

# 방법 3: seed 스크립트 수정 (scripts/seed.ts 또는 scripts/seed-postgres.ts)
# src/data/*-mock.ts의 데이터를 실제 값으로 교체 후:
npm run seed                   # SQLite
npx tsx scripts/seed-postgres.ts  # Postgres
```

### 데이터 확인

```bash
# 탭별 row 수
sqlite3 data/dashboard.db "SELECT tab, category, count(*) FROM metrics GROUP BY tab, category ORDER BY tab"

# 특정 고객 데이터
sqlite3 data/dashboard.db "SELECT date, value FROM metrics WHERE customer='SEC' AND category='internal_waferInput' ORDER BY date DESC LIMIT 5"

# Foundry 노드 데이터
sqlite3 data/dashboard.db "SELECT customer, date, value, metadata FROM metrics WHERE category='foundry_node' AND customer LIKE 'TSMC%' ORDER BY date DESC LIMIT 5"

# Server 선행지표
sqlite3 data/dashboard.db "SELECT customer, date, value FROM metrics WHERE category='server_indicator' ORDER BY date DESC LIMIT 5"

# Memory Price
sqlite3 data/dashboard.db "SELECT customer, date, value FROM metrics WHERE category='memory_price' ORDER BY date DESC LIMIT 5"
```

### 주의사항

- **seed 실행 시 기존 데이터 전체 삭제** (`DELETE FROM metrics`) 후 재삽입
- **투입량(waferInput)은 CAPA와 비슷한 수준**이어야 함 (가동률 = 투입량/CAPA)
- **Postgres 사용 시**: `.env.local`에 `POSTGRES_URL` 설정 + `npx tsx scripts/seed-postgres.ts` 실행
- **SQLite와 Postgres 동시 유지**: 두 seed 스크립트 모두 실행해야 데이터 동기화 (VCM 버전별 데이터, 영업 Data 포함)

---

## 현황판 탭 구성

### 탭1: 전방시장 (`components/supply-chain/`)

매크로/반도체/장비/어플리케이션/웨이퍼 카테고리별 시장 지표를 테이블+차트로 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `SupplyChainPage.tsx` | 메인 페이지 (사이드바 + 테이블 + 차트 조합) |
| `CategorySidebar.tsx` | 좌측 카테고리 선택 + 서브탭 (Server 선행지표, Memory Price) |
| `IndicatorTable.tsx` | 지표 테이블 (Actual, 3MMA, 12MMA, MoM, YoY 뷰 전환) — 12개월 표시 |
| `IndicatorChart.tsx` | 지표 라인차트 (최대 3개 선택, 클릭 해제, AI 데이터분석 내장) |
| `ServerLeadingIndicators.tsx` | Server 선행지표 계층 테이블 + 차트 (12MMA YoY %) |
| `MemoryPriceIndicators.tsx` | Memory Price 테이블 + 차트 (USD) |
| `FoundryUtilizationChart.tsx` | Foundry 노드별 가동률 차트 (고객별 탭에서 사용) |

**주요 동작:**
- 복수 지표 선택 가능 (최대 3개), 차트 범례에서 클릭으로 해제
- 오버레이: CAPA/투입량/가동률 내부 데이터 오버레이 (단위: K/M, %) — 메인 차트, Server 선행지표, Memory Price 모두 지원
- 오버레이 시 Pearson 상관관계 뱃지 표시 (강한/보통/약한/미약)
- 오버레이 Y축 독립 다이나믹 도메인 (스케일이 다른 지표도 적절히 표시)
- **AI 데이터분석**: 선택 지표의 12개월 추세, 전월대비 변화, 외부↔내부 상관관계를 AI가 개조식으로 해석
- 테이블 헤더: 년도/월 2행 분리, 년도 경계 세로선
- Application > Server 선행지표: 서버 밸류체인 계층 테이블
- Semiconductor > Memory Price: DRAM/NAND 가격 추이 테이블 (Y축 다이나믹)

### 탭2: VCM — 수요예측 (`components/vcm/`)

Application별/Device별 웨이퍼 수요를 예측 차트/테이블로 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `VcmPage.tsx` | 메인 페이지 (버전 셀렉트, 필터, 데이터분석 인라인 포함) |
| `TotalWaferLineChart.tsx` | 총 웨이퍼 수요 막대차트 (PW/EPI, 시장 vs 영업Data, AI 데이터분석) |
| `DemandBarChart.tsx` | Application별 Wafer 수요 막대 + 웨이퍼라인 (AI 데이터분석) |
| `DeviceStackedChart.tsx` | Device별 Stacked 영역차트 |

### 탭3: 고객별 (`components/customer-detail/`)

Memory/Foundry 고객사별 KPI, 월별 지표, 재무실적, 산업 지표 등을 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `CustomerDetailPage.tsx` | 메인 (상단 탭으로 고객사 전환) |
| `ExecutivePanel.tsx` | 경영진 요약 (KPI 카드, Product Mix) |
| `MonthlyMetricsChart.tsx` | 월별 지표 차트 (투입량/구매량/재고/가동률) |
| `ExternalComparison.tsx` | 외부 추정치 비교 + Foundry 가동률 차트 |
| `FinancialResultsTable.tsx` | 재무실적 테이블 |
| `TranscriptSummary.tsx` | Earnings Transcript AI 요약 |
| `IndustryMetricsPanel.tsx` | 산업 지표 |

**파운드리 고객 선택 시:**
- Foundry 노드별 가동률 차트 (TSMC: 노드 선택, UMC: 비선단 평균)
- 평균 가동률 = sum(투입량) / sum(CAPA) (가중평균)

---

## 폴더 구조

```
01_MI_Platform_Dashboard/
|
+-- src/
|   +-- app/
|   |   +-- page.tsx               # "/" -> V3Container (현황판 진입점)
|   |   +-- api/
|   |       +-- supply-chain/route.ts  # 전방시장 + Foundry노드 + Server선행 + MemoryPrice
|   |       +-- vcm/route.ts           # VCM 수요예측
|   |       +-- customer-detail/route.ts # 고객별 상세
|   |       +-- news/route.ts          # AI 뉴스 요약
|   |       +-- transcript/route.ts    # Earnings Transcript AI 요약
|   |       +-- ai-insight/route.ts    # AI 데이터분석 (지표/상관관계 해석)
|   |
|   +-- data/                      # Mock 데이터 (seed 스크립트 전용, 컴포넌트에서 미사용)
|   |   +-- supply-chain-mock.ts   # 전방시장 + 내부데이터 + Foundry노드
|   |   +-- vcm-mock.ts            # VCM 수요예측
|   |   +-- customer-detail-mock.ts # 고객별 상세
|   |
|   +-- components/
|   |   +-- V3Container.tsx        # 현황판 메인 컨테이너 (3탭 전환)
|   |   +-- AiInsightPanel.tsx     # AI 데이터분석 공통 패널 (VCM/고객별 탭용)
|   |   +-- supply-chain/          # 탭1 전방시장 (8개 컴포넌트, CorrelationBadges 포함)
|   |   +-- vcm/                   # 탭2 VCM 수요예측 (4개 컴포넌트)
|   |   +-- customer-detail/       # 탭3 고객별 상세 (10개 컴포넌트)
|   |
|   +-- hooks/                     # API 호출 hooks
|   |   +-- useSupplyChainData.ts  # 전방시장 + Foundry노드 + Server + MemoryPrice
|   |   +-- useVcmData.ts
|   |   +-- useCustomerDetailData.ts
|   |   +-- useNews.ts
|   |   +-- useDarkMode.ts
|   |
|   +-- lib/
|   |   +-- db.ts                  # DB 추상화 (SQLite + Postgres 자동 선택, parseMeta 포함)
|   |   +-- chart-utils.ts         # 차트 공통 유틸 (상관계수, 도메인, 포맷, 타입)
|   |   +-- data-generation.ts     # 공통 데이터 생성 유틸 (seededValue, getRecentMonths 등)
|   |   +-- cache.ts               # 파일+메모리 듀얼 캐시
|   |   +-- format.ts              # 숫자/통화 포맷
|   |   +-- news-utils.tsx         # 뉴스 유틸
|   |
|   +-- types/
|       +-- indicators.ts          # 전체 타입 정의
|
+-- scripts/
|   +-- seed.ts                    # Mock -> SQLite 변환 (npm run seed)
|   +-- seed-postgres.ts           # Mock -> Postgres 변환
|
+-- data/
|   +-- dashboard.db               # SQLite DB (git 제외)
|
+-- DATA_GUIDE.md                  # 실데이터 적재 상세 가이드
+-- CLAUDE.md                      # AI 어시스턴트 프로젝트 규칙
```

---

## AI 데이터분석 흐름

전방시장 차트의 "데이터분석" 버튼, VCM/고객별 탭의 "AI 분석" 버튼으로 실행합니다.

```
선택된 지표/오버레이 데이터 (최근 12개월)
        |
        v
Pearson 상관계수 계산 (외부지표 × 내부데이터 조합, |r| 높은순)
        |
        v
POST /api/ai-insight { tab, context }
        |
        v
Anthropic Claude Haiku 4.5 — 팩트 기반 개조식 분석
        |
        v
cache/ai-insight_*.json (24시간 TTL, MD5 해시 키)
```

**분석 내용:** 지표별 추세 + 전월대비 변화(MoM) + 외부↔내부 상관관계 해석
**지표/오버레이 변경 시 자동 재분석** (패널 열린 상태에서)

---

## 뉴스 AI 요약 흐름

뉴스 패널은 **기본 OFF**이며, 각 탭 상단의 "뉴스" 토글 버튼으로 켜고 끌 수 있습니다.

```
DB의 newsQuery 메타데이터
        |
        v
GET /api/news?q=서버+반도체+수요&qEn=server+semiconductor+demand
        |
        v
Google News RSS 검색 (한국어 + 영어)
        |
        v
Anthropic Claude Haiku 4.5 요약 생성
        |
        v
cache/news-*.json (24시간 TTL)
```
