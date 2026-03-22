# 실데이터 적재 가이드

실트론 MI플랫폼 현황판의 데이터베이스에 실데이터를 적재하는 방법을 설명합니다.

## 목차

1. [환경 준비](#1-환경-준비)
2. [DB 구조 이해](#2-db-구조-이해)
3. [데이터 형식 (Long-form)](#3-데이터-형식-long-form)
4. [탭별 데이터 적재 방법](#4-탭별-데이터-적재-방법)
5. [적재 검증](#5-적재-검증)
6. [FAQ](#6-faq)

---

## 1. 환경 준비

### 필수 사전 설치

- Node.js 18 이상
- npm

### 프로젝트 세팅

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local 파일 생성)
ANTHROPIC_API_KEY=sk-ant-...   # 뉴스 AI 요약 기능용 (선택)
TAVILY_API_KEY=tvly-...        # 뉴스 검색용 (선택)

# 3. 목업 데이터로 DB 생성 (테스트용)
npm run seed                          # SQLite (18,092 rows)
npx tsx scripts/seed-postgres.ts      # Postgres (배포용, 선택)

# 4. 개발 서버 실행
npm run dev
```

> **DB 선택**: `.env.local`에 `POSTGRES_URL` 또는 `DATABASE_URL`이 있으면 Postgres, 없으면 SQLite(`data/dashboard.db`)를 자동 사용합니다.
> **주의**: Postgres 사용 시 `seed-postgres.ts`도 실행해야 데이터가 반영됩니다.

---

## 2. DB 구조 이해

### 단일 테이블: `metrics`

모든 데이터가 **하나의 Long-form 테이블**에 저장됩니다.

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `tab` | TEXT | 대시보드 탭 구분 | `supply-chain`, `vcm`, `customer-detail` |
| `date` | TEXT | 기간 | `2025-01`, `Q2'24`, `_meta` |
| `customer` | TEXT | 엔티티명 (지표명/앱명/고객명) | `OECD CLI`, `SEC`, `Traditional Server` |
| `category` | TEXT | 메트릭 분류 | `actual`, `monthly_waferInput`, `stacked_dram` |
| `value` | REAL | 숫자 값 | `100.47`, `45.3` |
| `unit` | TEXT | 단위 | `Index`, `Km²`, `%`, `Kwsm` |
| `is_estimate` | INTEGER | 추정치 여부 (0/1) | `0` = 확정, `1` = 추정 |
| `version` | TEXT | 데이터 버전 | `current`, `previous` |
| `metadata` | TEXT | 추가 정보 (JSON) | `{"categoryId":"macro"}` |

### 특수 date 값

| date 값 | 의미 |
|---------|------|
| `_meta` | 메타데이터 (지표 설명, 고객 정보 등) |
| `_kpi` | KPI 스냅샷 |
| `_mix` | Product Mix 스냅샷 |
| `_static` | 시간 무관 정적 데이터 |
| `_weekly` | 주간 요약 |

---

## 3. 데이터 형식 (Long-form)

### 핵심 원칙

Wide-form (열 기반) 대신 Long-form (행 기반)으로 모든 데이터를 저장합니다.

**Wide-form (기존 Excel 방식):**
```
Date    | SEC_waferInput | SEC_utilization | SKH_waferInput | ...
23.03   | 43.3          | 92.9            | 52.1           | ...
23.04   | 44.1          | 93.2            | 53.0           | ...
```

**Long-form (DB 저장 방식):**
```
tab              | date  | customer | category            | value | unit
customer-detail  | 23.03 | SEC      | monthly_waferInput  | 43.3  | Km²
customer-detail  | 23.03 | SEC      | monthly_utilization | 92.9  | %
customer-detail  | 23.03 | SKHynix  | monthly_waferInput  | 52.1  | Km²
customer-detail  | 23.04 | SEC      | monthly_waferInput  | 44.1  | Km²
```

---

## 4. 탭별 데이터 적재 방법

### 방법 A: SQL로 직접 입력 (권장)

```bash
# DB에 직접 SQL 실행
sqlite3 data/dashboard.db
```

### 방법 B: CSV → SQL 변환

Excel에서 Long-form CSV를 만들어 import:
```bash
# 1. 기존 데이터 삭제 (특정 탭만)
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='customer-detail'"

# 2. CSV import
sqlite3 data/dashboard.db <<EOF
.mode csv
.import data/real-data.csv metrics
EOF
```

### 방법 C: seed 스크립트 수정

`scripts/seed.ts`의 mock import를 실데이터 파일로 교체합니다.

---

### 4-1. 전방시장 탭 (`tab = 'supply-chain'`)

#### 외부 지표 데이터 (월별)

5개 카테고리 × 각 3~6개 지표 × 36개월 × 5개 뷰모드

```sql
-- 예시: OECD CLI 2025년 1월 데이터
INSERT INTO metrics (tab, date, customer, category, value, unit) VALUES
('supply-chain', '2025-01', 'OECD CLI', 'actual',       100.47, 'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'threeMonthMA', 100.33, 'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'twelveMonthMA',100.15, 'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'mom',          0.3,    '%'),
('supply-chain', '2025-01', 'OECD CLI', 'yoy',          1.2,    '%');
```

**category 종류:**

| category | 설명 |
|----------|------|
| `actual` | 실제값 |
| `threeMonthMA` | 3개월 이동평균 |
| `twelveMonthMA` | 12개월 이동평균 |
| `mom` | 전월 대비 증감률 (%) |
| `yoy` | 전년 동월 대비 증감률 (%) |

**지표 목록 (customer 값):**

| 카테고리 | 지표명 (customer) | 단위 (unit) |
|----------|------------------|-------------|
| Macro | `OECD CLI` | Index |
| Macro | `Manufacturing PMI` | Index |
| Macro | `Hyperscaler Capex Trends` | $B |
| Application | `Smartphone Shipment` | M units |
| Application | `PC Shipment` | M units |
| Application | `Electric Vehicle/EV Shipment` | M units |
| Semiconductor | `Memory Price - DDR4 16Gb` | $ |
| Semiconductor | `Memory Price - DDR5 16Gb` | $ |
| Semiconductor | `NAND 512Gb TLC` | $ |
| Semiconductor | `Memory Bit Growth - DRAM` | % |
| Semiconductor | `Memory Bit Growth - NAND` | % |
| Semiconductor | `Semi. Revenue` | $B |
| Equipment | `Major Foundry Revenue - TSMC` | $B |
| Equipment | `Major Foundry Revenue - UMC` | $B |
| Equipment | `Billings of Equipment - N.America (SB)` | $B |
| Equipment | `Billings of Equipment - Japan (VB)` | $B |
| Equipment | `Mass Flow Controller` | Index |
| Equipment | `Korea's Semiconductor Equipment Imports` | $B |
| Wafer | `300mm Shipment (PW)` | Mpcs |
| Wafer | `300mm Shipment (EPI)` | Mpcs |
| Wafer | `200mm Shipment (PW)` | Mpcs |
| Wafer | `200mm Shipment (EPI)` | Mpcs |
| Wafer | `150mm Shipment (PW)` | Mpcs |
| Wafer | `150mm Shipment (EPI)` | Mpcs |

#### 지표 메타데이터 (지표당 1행)

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, metadata) VALUES
('supply-chain', '_meta', 'OECD CLI', 'indicatorMeta', NULL, 'Index',
 '{"id":"A","categoryId":"macro","categoryLabel":"Macro","judgment":"OECD 경기선행지수 100 회복","leadingRating":"상","ratingReason":"경기선행지수는 반도체 수요와 6~9개월 선행 상관관계","semiAnnualEval":{"half":"H2","rating":"positive","value":1.2}}');
```

**metadata JSON 필드:**

| 필드 | 설명 | 예시 |
|------|------|------|
| `id` | 카테고리 내 지표 순번 | `"A"`, `"B"`, `"C"` |
| `categoryId` | 카테고리 ID | `"macro"`, `"application"`, `"semiconductor"`, `"equipment"`, `"wafer"` |
| `categoryLabel` | 카테고리 표시명 | `"Macro"`, `"Application"` |
| `judgment` | 지표 판단 코멘트 | 한글 문자열 |
| `leadingRating` | 선행지표 등급 | `"상"`, `"중상"`, `"중"`, `"중하"`, `"하"` |
| `ratingReason` | 등급 근거 | 한글 문자열 |
| `semiAnnualEval` | 반기 평가 | `{"half":"H2","rating":"positive","value":1.2}` |

#### 내부 회사 데이터 — CAPA/투입량/가동률 (월별)

```sql
-- 예시: SEC 2025년 3월
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('supply-chain', '2025-03', 'SEC', 'internal_capa',        11855, 'K/M', 'SEC'),
('supply-chain', '2025-03', 'SEC', 'internal_waferInput',  10630, 'K/M', 'SEC'),
('supply-chain', '2025-03', 'SEC', 'internal_utilization',    89, '%',   'SEC');
```

> **중요**: 투입량(waferInput)은 CAPA와 비슷한 수준이어야 합니다. 가동률 = 투입량 / CAPA.
> 예: CAPA=11,855, 투입량=10,630 → 가동률 약 89.7%

**회사 목록 (customer):** `SEC`, `SK Hynix`, `Micron` (메모리) / `TSMC`, `SMIC`, `GFs` (파운드리)

**category 종류:**

| category | 설명 | unit |
|----------|------|------|
| `internal_capa` | 생산능력 | K/M |
| `internal_waferInput` | 투입량 | K/M |
| `internal_utilization` | 가동률 | % |

#### 오버레이 색상

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('supply-chain', '_meta', 'SEC',      'overlayColor', NULL, NULL, '#f59e0b'),
('supply-chain', '_meta', 'SK Hynix', 'overlayColor', NULL, NULL, '#06b6d4');
```

#### Foundry 노드별 가동률 (`category = 'foundry_node'`)

TSMC/UMC 공정 노드별 투입량과 CAPA. 가동률은 프론트엔드에서 계산 (투입량/CAPA*100).
고객별 탭에서 파운드리 고객 선택 시 표시됩니다.

```sql
-- TSMC 7nm 노드 2025년 3월
INSERT INTO metrics (tab, date, customer, category, value, unit, version, metadata) VALUES
('supply-chain', '2025-03', 'TSMC_7n', 'foundry_node', 14500, 'K/M', 'TSMC',
 '{"capa":15200,"nodeId":"7n","nodeLabel":"7nm","category":"advanced"}');
```

**customer 형식**: `{회사}_{노드ID}` (예: `TSMC_7n`, `UMC_28n`)

**TSMC 노드**: `90n`, `45n`, `28n`, `12n` (비선단/mature) | `7n`, `5n`, `3n`, `2n` (선단/advanced)
**UMC 노드**: `90n`, `45n`, `28n`, `12n` (전부 비선단/mature)

**metadata JSON 필드:**

| 필드 | 설명 | 예시 |
|------|------|------|
| `capa` | 해당 노드 CAPA | `15200` |
| `nodeId` | 노드 ID | `"7n"` |
| `nodeLabel` | 표시명 | `"7nm"` |
| `category` | 선단/비선단 | `"advanced"` 또는 `"mature"` |

**노드 색상:**
```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('supply-chain', '_meta', '7n', 'foundry_node_color', NULL, NULL, '#22c55e');
```

#### Server 선행지표 (`category = 'server_indicator'`)

서버 밸류체인 선행지표. 값은 12MMA YoY (%).
전방시장 탭 > Application > Server 선행지표 서브탭에서 표시됩니다.

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version, metadata) VALUES
('supply-chain', '2025-03', 'wistron', 'server_indicator', -4.2, '%', 'Wistron',
 '{"group":"서버 공급자","subGroup":"서버\nODM","company":"Wistron"}');
```

**지표 목록:**

| customer (ID) | group | subGroup | company (version) |
|---------------|-------|----------|-------------------|
| `srv_sales` | 서버판매량 | (없음) | 서버판매량 |
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

#### Memory Price (`category = 'memory_price'`)

DRAM/NAND 가격 데이터 (USD).
전방시장 탭 > Semiconductor > Memory Price 서브탭에서 표시됩니다.

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('supply-chain', '2025-03', 'ddr4_8g_pc', 'memory_price', 1.65, '$', '8GB DDR4 DIMM (PC)');
```

**지표 목록:**

| customer (ID) | version (표시명) |
|---------------|-----------------|
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

---

### 4-2. VCM 탭 (`tab = 'vcm'`)

#### Application 수요 (연간)

```sql
-- 예시: AI Server 2025년 수요
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, metadata) VALUES
('vcm', '2025', 'AI/Highpower Server', 'appDemand', 950000, 'units', 1,
 '{"application":"aiServer"}');
```

**application 키 (metadata.application):**
`traditionalServer`, `aiServer`, `smartphone`, `pcNotebook`, `electricVehicle`, `ioe`, `automotive`

#### Device Wafer 수요 (연간)

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, metadata) VALUES
('vcm', '2025', 'DRAM', 'deviceWaferDemand', 1580, 'Kwsm', 1, '{"device":"dram"}');
```

**device 키:** `dram`, `hbm`, `nand`, `foundry`, `discrete`, `otherMemory`, `logic`, `analog`, `sensor`

#### Total Wafer 분기별

```sql
-- 3개 행이 한 세트 (total, pw, epi)
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('vcm', 'Q2''24', 'Total', 'totalWaferQuarterly_total', 1650, 'Kwsm', 0),
('vcm', 'Q2''24', 'Total', 'totalWaferQuarterly_pw',    1010, 'Kwsm', 0),
('vcm', 'Q2''24', 'Total', 'totalWaferQuarterly_epi',   640,  'Kwsm', 0);
```

#### Device Stacked 분기별 (앱별 디바이스 분해)

```sql
-- 각 디바이스별 1행씩 (8개 디바이스 × 분기)
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, metadata) VALUES
('vcm', 'Q2''24', 'Traditional Server', 'stacked_dram',       280, 'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_hbm',        5,   'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_nand',       120, 'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_otherMemory',18,  'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_logic',      52,  'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_analog',     14,  'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_discrete',   22,  'Kwsm', 0, '{"application":"traditionalServer"}'),
('vcm', 'Q2''24', 'Traditional Server', 'stacked_sensor',     6,   'Kwsm', 0, '{"application":"traditionalServer"}');
```

---

### 4-3. 고객별 탭 (`tab = 'customer-detail'`)

#### 고객 목록

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, metadata) VALUES
('customer-detail', '_meta', 'SEC', 'customerList', NULL, NULL,
 '{"label":"SEC","type":"memory","subLabel":"Prime(메모리)"}');
```

**등록된 고객 (customer):**

| customer | label | type | subLabel |
|----------|-------|------|----------|
| `SEC` | SEC | memory | Prime(메모리) |
| `SKHynix` | SKHY | memory | Prime(메모리) |
| `Micron` | Micron | memory | Prime(메모리) |
| `Koxia` | Koxia | memory | Prime(메모리) |
| `SEC_Foundry` | SEC | foundry | EPI(파운드리) |
| `TSMC` | TSMC | foundry | EPI(파운드리) |
| `SMC` | SMIC | foundry | EPI(파운드리) |
| `GFS` | GFs | foundry | EPI(파운드리) |
| `STM` | STM | foundry | EPI(파운드리) |
| `Intel` | Intel | foundry | EPI(파운드리) |
| `Total_DRAM_NAND` | Total DRAM/NAND | aggregate | - |
| `Total_Foundry` | Total Foundry | aggregate | - |

#### 월별 메트릭 (핵심 데이터)

```sql
-- SEC 2025년 3월 데이터 (current 버전)
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('customer-detail', '25.03', 'SEC', 'monthly_waferInput',      45.2,  'Km²',    'current'),
('customer-detail', '25.03', 'SEC', 'monthly_purchaseVolume',  38.5,  'Km²',    'current'),
('customer-detail', '25.03', 'SEC', 'monthly_inventoryMonths', 2.1,   'months', 'current'),
('customer-detail', '25.03', 'SEC', 'monthly_utilization',     91.0,  '%',      'current'),
('customer-detail', '25.03', 'SEC', 'monthly_inventoryLevel',  78.0,  'months', 'current'),
('customer-detail', '25.03', 'SEC', 'monthly_capa',            51.8,  'Km²',    'current'),
('customer-detail', '25.03', 'SEC', 'monthly_dramRatio',       0.65,  'ratio',  'current');

-- 전월 버전 (비교용)
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('customer-detail', '25.03', 'SEC', 'monthly_waferInput',      44.8,  'Km²',    'previous');
```

**date 형식:** `YY.MM` (예: `23.03` = 2023년 3월)

**version:**
- `current` = 최신 집계 (예: "26년 2월 집계")
- `previous` = 이전 집계 (예: "26년 1월 집계") — 비교 차트용

**category 종류:**

| category | 설명 | unit |
|----------|------|------|
| `monthly_waferInput` | 투입량 | Km² |
| `monthly_purchaseVolume` | 구매량 | Km² |
| `monthly_inventoryMonths` | 재고 개월수 | months |
| `monthly_utilization` | 가동률 | % |
| `monthly_inventoryLevel` | 재고 수준 | months |
| `monthly_capa` | 생산능력 | Km² |
| `monthly_dramRatio` | DRAM 비중 (memory 고객만) | ratio |

#### 분기별 Wafer In/Out

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('customer-detail', 'Q1''25', 'SEC', 'quarterly_waferIn',  4800, 'Kwsm', 0),
('customer-detail', 'Q1''25', 'SEC', 'quarterly_waferOut', 4600, 'Kwsm', 0),
('customer-detail', 'Q1''25', 'SEC', 'quarterly_dramRatio',0.62, 'ratio',0);
```

#### 분기별 Bit Growth

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('customer-detail', 'Q1''25', 'SEC', 'quarterly_bitGrowth',   8.5, '%', 0),
('customer-detail', 'Q1''25', 'SEC', 'quarterly_bitGrowthTF', 8.1, '%', 0);  -- TrendForce 추정
```

#### KPI 메트릭

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit) VALUES
('customer-detail', '_kpi', 'SEC', 'kpiMetric_개방선인 수', 4.2, '건'),
('customer-detail', '_kpi', 'SEC', 'kpiMetric_Silicon 자원', 87,  '%'),
('customer-detail', '_kpi', 'SEC', 'kpiMetric_공폐율',       2.3, '%');
```

#### 주간 요약

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, metadata) VALUES
('customer-detail', '_weekly', 'SEC', 'weeklySummary', NULL, NULL,
 '{"weekLabel":"Week 1, Mar 2026","comment":"주요 판단: AI 투자심리 상단 조심 필요. HBM3E Qual 진행률 정상."}');
```

#### 재무실적 (분기별 매출 / 영업이익)

재무실적 테이블(`FinancialResultsTable`)에 표시됩니다. 4Q/8Q/12Q 기간 선택, 분기별/년도별 전환 지원.

```sql
-- SEC 2025년 Q1 매출
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('customer-detail', 'Q1''25', 'SEC', 'financial_revenue',         67500, 'M KRW', 0),
('customer-detail', 'Q1''25', 'SEC', 'financial_operatingIncome', 6600,  'M KRW', 0);

-- 추정치 예시 (is_estimate=1)
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('customer-detail', 'Q2''25', 'SEC', 'financial_revenue',         70000, 'M KRW', 1),
('customer-detail', 'Q2''25', 'SEC', 'financial_operatingIncome', 7200,  'M KRW', 1);
```

**date 형식:** `Q#'YY` (예: `Q1'25` = 2025년 1분기)

**category 종류:**

| category | 설명 | unit 예시 |
|----------|------|-----------|
| `financial_revenue` | 분기 매출 | `M KRW`, `M USD` |
| `financial_operatingIncome` | 분기 영업이익 | `M KRW`, `M USD` |

#### Earnings Transcript AI 요약

Earnings Call 텍스트를 저장하면 `POST /api/transcript`가 Anthropic AI로 요약합니다.
`TranscriptSummary` 컴포넌트에서 실시간 요약을 표시합니다.

```sql
-- SEC 2025년 Q1 Earnings Call 원문 (metadata에 저장)
INSERT INTO metrics (tab, date, customer, category, value, unit, metadata) VALUES
('customer-detail', 'Q1''25', 'SEC', 'transcript', NULL, NULL,
 '{"rawText":"Good morning. Thank you for joining...","lang":"en"}');
```

**metadata JSON 필드:**

| 필드 | 설명 | 예시 |
|------|------|------|
| `rawText` | Earnings Call 원문 텍스트 | 영문/한글 문자열 |
| `lang` | 원문 언어 | `"en"`, `"ko"` |

#### 산업 지표 (IndustryMetricsPanel)

파운드리 산업 지표 및 HBM Bit Growth 등을 표시합니다.

```sql
-- HBM Bit Growth (분기별)
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate) VALUES
('customer-detail', 'Q1''25', 'Industry', 'industry_metric', 35.2, '%', 0);
-- metadata로 지표 종류 구분
INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, metadata) VALUES
('customer-detail', 'Q1''25', 'TSMC',     'industry_metric', 88.5, '%', 0, '{"metricType":"utilization"}'),
('customer-detail', 'Q1''25', 'UMC',      'industry_metric', 72.3, '%', 0, '{"metricType":"utilization"}'),
('customer-detail', 'Q1''25', 'Industry', 'industry_metric', 35.2, '%', 0, '{"metricType":"hbmBitGrowth"}'),
('customer-detail', 'Q1''25', 'Auto',     'industry_metric', 12.1, 'M units', 0, '{"metricType":"autoSales"}'),
('customer-detail', 'Q1''25', 'Analog',   'industry_metric', 3.8,  '$B', 0, '{"metricType":"analogRevenue"}'),
('customer-detail', 'Q1''25', 'MCU',      'industry_metric', 2.1,  '$B', 0, '{"metricType":"mcuRevenue"}'),
('customer-detail', 'Q1''25', 'MPU',      'industry_metric', 5.4,  '$B', 0, '{"metricType":"mpuRevenue"}');
```

**metricType 종류:**

| metricType | 설명 | unit |
|------------|------|------|
| `utilization` | 파운드리 가동률 (TSMC/UMC) | `%` |
| `hbmBitGrowth` | HBM Bit Growth | `%` |
| `autoSales` | Automotive 판매량 | `M units` |
| `analogRevenue` | Analog 매출 | `$B` |
| `mcuRevenue` | MCU 매출 | `$B` |
| `mpuRevenue` | MPU 매출 | `$B` |

---

## 5. 적재 검증

### 터미널에서 확인

```bash
# 전체 row 수 확인 (카테고리별)
sqlite3 data/dashboard.db "SELECT tab, category, count(*) FROM metrics GROUP BY tab, category ORDER BY tab"

# 특정 고객 데이터 확인
sqlite3 data/dashboard.db "SELECT date, category, value, unit FROM metrics WHERE tab='customer-detail' AND customer='SEC' AND category='monthly_waferInput' AND version='current' ORDER BY date DESC LIMIT 6"

# 전방시장 지표 목록 확인
sqlite3 data/dashboard.db "SELECT customer, unit, substr(metadata,1,50) FROM metrics WHERE tab='supply-chain' AND category='indicatorMeta'"

# 내부 데이터 (CAPA/투입량) 확인 — 투입량이 CAPA 수준인지 확인
sqlite3 data/dashboard.db "SELECT customer, category, value FROM metrics WHERE tab='supply-chain' AND category IN ('internal_capa','internal_waferInput') AND date='2026-03' ORDER BY customer, category"

# Foundry 노드 데이터
sqlite3 data/dashboard.db "SELECT customer, date, value, json_extract(metadata,'$.capa') as capa FROM metrics WHERE category='foundry_node' AND customer LIKE 'TSMC%' ORDER BY date DESC LIMIT 5"

# Server 선행지표
sqlite3 data/dashboard.db "SELECT customer, date, value, version FROM metrics WHERE category='server_indicator' ORDER BY date DESC LIMIT 10"

# Memory Price
sqlite3 data/dashboard.db "SELECT customer, date, value, version FROM metrics WHERE category='memory_price' ORDER BY date DESC LIMIT 10"

# VCM 디바이스 수요 확인
sqlite3 data/dashboard.db "SELECT date, customer, value FROM metrics WHERE tab='vcm' AND category='deviceWaferDemand' ORDER BY date, customer"
```

### 브라우저에서 확인

```bash
npm run dev
# http://localhost:3000 접속 후 각 탭 확인
```

---

## 6. FAQ

### Q: 기존 목업 데이터를 전부 삭제하고 실데이터만 넣고 싶어요

```bash
# 전체 삭제 후 새로 적재
sqlite3 data/dashboard.db "DELETE FROM metrics"
# 이후 실데이터 INSERT 실행
```

### Q: 특정 탭만 실데이터로 교체하고 싶어요

```bash
# 예: 고객별 탭만 교체
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='customer-detail'"
# 이후 해당 탭 데이터만 INSERT
```

### Q: 특정 고객의 데이터만 업데이트하고 싶어요

```bash
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='customer-detail' AND customer='SEC'"
# 이후 SEC 데이터만 INSERT
```

### Q: Excel에서 Long-form CSV를 만드는 방법은?

1. Excel에서 아래 헤더로 시트 작성:
   ```
   tab, date, customer, category, value, unit, is_estimate, version, metadata
   ```
2. 각 행에 하나의 값만 입력 (Long-form)
3. CSV로 저장
4. import:
   ```bash
   sqlite3 data/dashboard.db <<EOF
   .mode csv
   .headers on
   .import data/your-file.csv metrics
   EOF
   ```

### Q: DB를 초기 목업 상태로 되돌리고 싶어요

```bash
# SQLite
rm data/dashboard.db
npm run seed                          # 18,092 rows

# Postgres (배포용)
npx tsx scripts/seed-postgres.ts      # 18,092 rows
```

### Q: Postgres를 사용 중인데 데이터가 안 바뀌어요

`.env.local`에 `POSTGRES_URL`이 설정되어 있으면 SQLite가 아닌 Postgres에서 데이터를 가져옵니다.
SQLite seed(`npm run seed`)만 실행하면 Postgres에는 반영되지 않습니다.

```bash
# 두 DB 모두 시드
npm run seed                          # SQLite
npx tsx scripts/seed-postgres.ts      # Postgres
```

### Q: 날짜 형식이 헷갈려요

| 탭 | date 형식 | 예시 |
|----|-----------|------|
| supply-chain | `YYYY-MM` | `2025-01` |
| vcm (연간) | `YYYY` | `2025` |
| vcm (분기) | `Q#'YY` | `Q2'24` |
| customer-detail (월간) | `YY.MM` | `25.03` |
| customer-detail (분기) | `Q#'YY` | `Q1'25` |
| 메타데이터 | `_meta` / `_kpi` / `_weekly` | - |

### Q: 새 고객을 추가하고 싶어요

1. `customerList` 메타 행 추가
2. `customerMeta` 메타 행 추가
3. 해당 고객의 월별/분기별 데이터 행 INSERT
4. 브라우저에서 확인

```sql
-- 1. 고객 목록에 추가
INSERT INTO metrics (tab, date, customer, category, metadata) VALUES
('customer-detail', '_meta', 'NewCo', 'customerList', '{"label":"NewCo","type":"memory","subLabel":"Prime(메모리)"}');

-- 2. 고객 메타정보
INSERT INTO metrics (tab, date, customer, category, metadata) VALUES
('customer-detail', '_meta', 'NewCo', 'customerMeta', '{"label":"NewCo","type":"memory","versionLabel":"26년 2월 집계","prevVersionLabel":"26년 1월 집계"}');

-- 3. 이후 monthly_*, quarterly_* 등 데이터 추가
```

---

## 7. 실데이터 적재 순서

데이터 간 의존관계가 있으므로 아래 순서로 적재하세요.

### Step 1: 메타데이터 먼저 (필수)

메타데이터가 없으면 화면에 지표/고객이 표시되지 않습니다.

```
1-1. 전방시장 지표 메타데이터      → indicatorMeta (지표당 1행)
1-2. 전방시장 오버레이 색상        → overlayColor (회사당 1행)
1-3. Foundry 노드 색상            → foundry_node_color (노드당 1행)
1-4. 고객 목록                    → customerList (고객당 1행)
1-5. 고객 메타정보                → customerMeta (고객당 1행)
```

### Step 2: 시계열 데이터 (필수)

```
2-1. 전방시장 외부 지표 월별       → actual/threeMonthMA/twelveMonthMA/mom/yoy
2-2. 내부 데이터 오버레이          → internal_capa/internal_waferInput/internal_utilization
2-3. Foundry 노드별 데이터        → foundry_node
2-4. Server 선행지표              → server_indicator
2-5. Memory Price                 → memory_price
2-6. 고객별 월별 메트릭            → monthly_waferInput, monthly_capa 등
2-7. 고객별 분기별 Wafer In/Out    → quarterly_waferIn/waferOut
```

### Step 3: 부가 데이터 (선택)

없어도 화면이 동작하지만 해당 패널이 비어 보입니다.

```
3-1. KPI 메트릭                   → kpiMetric_* (Executive Panel용)
3-2. 주간 요약                    → weeklySummary
3-3. 재무실적                     → financial_revenue/operatingIncome
3-4. Earnings Transcript          → transcript
3-5. VCM 데이터                   → appDemand/deviceWaferDemand/totalWaferQuarterly 등
3-6. Bit Growth                   → quarterly_bitGrowth
3-7. Estimate Trend               → estimateTrend_*
```

---

## 8. 필수 vs 선택 데이터

| 데이터 | 필수 여부 | 없을 때 영향 |
|--------|----------|-------------|
| `indicatorMeta` | **필수** | 전방시장 테이블이 비어있음 |
| `actual` 등 5개 뷰모드 | **필수** | 전방시장 테이블/차트에 값 없음 |
| `internal_capa/waferInput/utilization` | **필수** | 오버레이 차트 표시 안됨 |
| `overlayColor` | 선택 | 기본 회색(#64748b)으로 표시 |
| `foundry_node` | **필수** | 파운드리 고객의 노드별 가동률 차트 없음 |
| `foundry_node_color` | 선택 | 기본 색상으로 표시 |
| `server_indicator` | **필수** | Server 선행지표 탭이 비어있음 |
| `memory_price` | **필수** | Memory Price 탭이 비어있음 |
| `customerList` | **필수** | 고객 탭이 비어있음 |
| `customerMeta` | **필수** | 고객 선택 시 데이터 없음 |
| `monthly_*` | **필수** | Wafer 주요 지표 차트 비어있음 |
| `quarterly_waferIn/Out` | 선택 | Wafer In/Out 차트 비어있음 |
| `financial_*` | 선택 | 재무실적 테이블 비어있음 |
| `transcript` | 선택 | Transcript 요약 패널 비어있음 |
| `kpiMetric_*` | 선택 | Executive Panel 일부 비어있음 |
| `weeklySummary` | 선택 | 주간 요약 없음 |
| VCM 전체 | 선택 | VCM 탭 비어있음 (다른 탭에 영향 없음) |

---

## 9. End-to-End 예시: 전방시장 지표 하나를 처음부터 적재

"OECD CLI" 지표를 실데이터로 적재하는 전체 과정입니다.

### Step 1: 기존 목업 데이터 삭제

```bash
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='supply-chain' AND customer='OECD CLI'"
```

### Step 2: 메타데이터 입력

```sql
INSERT INTO metrics (tab, date, customer, category, value, unit, metadata) VALUES
('supply-chain', '_meta', 'OECD CLI', 'indicatorMeta', NULL, 'Index',
 '{"id":"A","categoryId":"macro","categoryLabel":"Macro","name":"OECD CLI","unit":"Index","judgment":"OECD 경기선행지수 100 회복, 글로벌 경기 확장 국면 진입 시사","leadingRating":"상","ratingReason":"경기선행지수는 반도체 수요와 6~9개월 선행 상관관계가 높은 핵심 거시 선행지표","semiAnnualEval":{"half":"H2","rating":"positive","value":1.2}}');
```

### Step 3: 월별 시계열 데이터 입력 (36개월 x 5뷰)

```sql
-- 2025년 1월 데이터 (5행이 한 세트)
INSERT INTO metrics (tab, date, customer, category, value, unit) VALUES
('supply-chain', '2025-01', 'OECD CLI', 'actual',        100.05, 'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'threeMonthMA',  99.92,  'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'twelveMonthMA', 99.78,  'Index'),
('supply-chain', '2025-01', 'OECD CLI', 'mom',           0.15,   '%'),
('supply-chain', '2025-01', 'OECD CLI', 'yoy',           0.82,   '%');

-- 2025년 2월 데이터
INSERT INTO metrics (tab, date, customer, category, value, unit) VALUES
('supply-chain', '2025-02', 'OECD CLI', 'actual',        100.12, 'Index'),
('supply-chain', '2025-02', 'OECD CLI', 'threeMonthMA',  100.01, 'Index'),
('supply-chain', '2025-02', 'OECD CLI', 'twelveMonthMA', 99.85,  'Index'),
('supply-chain', '2025-02', 'OECD CLI', 'mom',           0.07,   '%'),
('supply-chain', '2025-02', 'OECD CLI', 'yoy',           0.95,   '%');

-- ... 나머지 34개월 동일 패턴 반복 ...
```

### Step 4: 검증

```bash
# 행 수 확인 (메타 1행 + 36개월 x 5뷰 = 181행)
sqlite3 data/dashboard.db "SELECT count(*) FROM metrics WHERE tab='supply-chain' AND customer='OECD CLI'"

# 최근 데이터 확인
sqlite3 data/dashboard.db "SELECT date, category, value FROM metrics WHERE customer='OECD CLI' AND category='actual' ORDER BY date DESC LIMIT 3"
```

### Step 5: 브라우저 확인

```bash
npm run dev
# http://localhost:3000 → 전방시장 → Macro → OECD CLI 확인
```

> **Postgres 사용 시**: 위 SQL을 Postgres에도 동일하게 실행하거나, `seed-postgres.ts`를 수정 후 재실행

---

## 10. 데이터 갱신 (매월 업데이트)

### 방법 A: DELETE + INSERT (권장)

기존 데이터를 삭제하고 새 데이터를 넣습니다. 가장 안전합니다.

```bash
# 예: 2026년 3월 데이터 갱신
sqlite3 data/dashboard.db <<EOF

-- 1. 해당 월 기존 데이터 삭제
DELETE FROM metrics WHERE tab='supply-chain' AND date='2026-03' AND category IN ('actual','threeMonthMA','twelveMonthMA','mom','yoy');

-- 2. 새 데이터 입력
INSERT INTO metrics (tab, date, customer, category, value, unit) VALUES
('supply-chain', '2026-03', 'OECD CLI', 'actual', 100.58, 'Index'),
('supply-chain', '2026-03', 'OECD CLI', 'threeMonthMA', 100.45, 'Index'),
('supply-chain', '2026-03', 'OECD CLI', 'twelveMonthMA', 100.30, 'Index'),
('supply-chain', '2026-03', 'OECD CLI', 'mom', 0.18, '%'),
('supply-chain', '2026-03', 'OECD CLI', 'yoy', 1.05, '%');
-- ... 나머지 지표들도 동일 패턴 ...

EOF
```

### 방법 B: 전체 재적재

모든 데이터를 한번에 교체할 때 사용합니다.

```bash
# 1. 특정 탭 전체 삭제
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='supply-chain'"

# 2. 전체 데이터 재입력 (SQL 파일 또는 CSV)
sqlite3 data/dashboard.db < data/supply-chain-real.sql
```

### 방법 C: seed 스크립트 활용

`src/data/supply-chain-mock.ts`의 mock 값을 실데이터로 교체한 뒤:

```bash
npm run seed                          # SQLite 전체 재생성
npx tsx scripts/seed-postgres.ts      # Postgres 전체 재생성
```

> **주의**: seed는 `DELETE FROM metrics`로 **모든 탭 데이터를 삭제** 후 재삽입합니다. 특정 탭만 갱신하려면 방법 A 또는 B를 사용하세요.

### 고객별 데이터 갱신 (전월조사 비교)

고객별 탭은 `version` 컬럼으로 현재/이전 데이터를 구분합니다.

```bash
sqlite3 data/dashboard.db <<EOF

-- 1. 이전 버전을 previous로 변경 (기존 current → previous)
UPDATE metrics SET version='previous'
WHERE tab='customer-detail' AND customer='SEC'
  AND category LIKE 'monthly_%' AND version='current';

-- 2. 새 데이터를 current로 입력
INSERT INTO metrics (tab, date, customer, category, value, unit, version) VALUES
('customer-detail', '26.03', 'SEC', 'monthly_waferInput', 46.5, 'Km²', 'current'),
('customer-detail', '26.03', 'SEC', 'monthly_capa',       52.0, 'Km²', 'current'),
('customer-detail', '26.03', 'SEC', 'monthly_utilization', 89.4, '%',   'current');
-- ... 나머지 monthly_* 동일 ...

EOF
```

이렇게 하면 "전월조사 비교" 버튼으로 current vs previous를 비교할 수 있습니다.

---

## 11. CSV 템플릿으로 대량 적재

`data/templates/` 폴더에 빈 CSV 템플릿이 준비되어 있습니다. Excel에서 값만 채워 import하세요.

### 템플릿 목록

| 파일 | 용도 | value 열에 넣을 값 |
|------|------|-------------------|
| `supply-chain-indicators.csv` | 전방시장 외부 지표 (월별) | 실제 수치 (actual/3MMA/12MMA/MoM/YoY) |
| `supply-chain-internal.csv` | 내부 데이터 (CAPA/투입량/가동률) | CAPA(K/M), 투입량(K/M), 가동률(%) |
| `foundry-nodes.csv` | Foundry 노드별 데이터 | 투입량 + metadata의 capa 값 |
| `server-indicators.csv` | Server 선행지표 | 12MMA YoY (%) |
| `memory-price.csv` | Memory Price | USD 가격 |
| `customer-detail-monthly.csv` | 고객별 월별 메트릭 | 투입량/구매량/가동률 등 |

### 사용법

```bash
# 1. 템플릿 복사
cp data/templates/memory-price.csv data/real-memory-price.csv

# 2. Excel에서 열기 → value 열에 실데이터 입력 → 저장
#    - date 열을 필요한 월로 복사/확장 (36개월)
#    - value 열에 실제 값 입력

# 3. 기존 데이터 삭제 (해당 카테고리만)
sqlite3 data/dashboard.db "DELETE FROM metrics WHERE tab='supply-chain' AND category='memory_price'"

# 4. CSV import
sqlite3 data/dashboard.db <<EOF
.mode csv
.headers on
.import data/real-memory-price.csv metrics
EOF

# 5. 검증
npx tsx scripts/validate.ts
```

### Excel → CSV 작업 팁

1. **날짜 확장**: 템플릿은 1개월 샘플만 있으므로, 행을 복사하여 36개월(3년)치로 확장
2. **date 열 수정**: `2025-01` → `2025-02`, `2025-03`, ... 순서대로
3. **value 열만 편집**: 나머지 컬럼(tab, customer, category 등)은 그대로 유지
4. **CSV 저장**: Excel에서 "다른 이름으로 저장" → CSV UTF-8 선택

---

## 12. 자동 검증 스크립트

데이터 적재 후 `validate.ts`로 모든 필수 데이터가 정상인지 확인합니다.

```bash
npx tsx scripts/validate.ts
```

### 출력 예시

```
========================================
  데이터 적재 검증 결과
========================================

  ✓ 전체 데이터: 총 18,092행
  ✓ 탭: supply-chain: 6,482행
  ✓ 탭: vcm: 1,179행
  ✓ 탭: customer-detail: 10,431행
  ✓ 전방시장: 지표 메타데이터: 24개 지표
  ✓ 전방시장: 시계열 데이터: actual 864행
  ✓ 내부데이터: SEC: 36개월, 가동률 약 90%
  ...
  ✓ Foundry 노드: 432행 (TSMC, UMC)
  ✓ Server 선행지표: 504행 (14개 지표)
  ✓ Memory Price: 540행 (15개 지표)
  ✓ 고객 목록: 12개 고객

  결과: 19 PASS / 0 WARN / 0 FAIL
  모든 데이터가 정상 적재되었습니다!
```

### 상태 의미

| 상태 | 의미 |
|------|------|
| **PASS** | 정상 |
| **WARN** | 없어도 동작하지만 일부 패널이 비어 보임 |
| **FAIL** | 필수 데이터 누락 — 해당 탭/기능이 동작하지 않음 |

> **투입량/CAPA 비율 경고**: 투입량이 CAPA의 30% 미만이거나 120% 초과이면 WARN이 표시됩니다.

---

## 13. 트러블슈팅 — 값이 안 보일 때 체크리스트

### 전방시장 테이블이 비어있음

```bash
# 1. indicatorMeta가 있는지 확인
sqlite3 data/dashboard.db "SELECT COUNT(*) FROM metrics WHERE category='indicatorMeta'"
# → 0이면: 지표 메타데이터를 먼저 적재 (섹션 4-1 참고)

# 2. actual 데이터가 있는지 확인
sqlite3 data/dashboard.db "SELECT COUNT(*) FROM metrics WHERE category='actual' AND tab='supply-chain'"
# → 0이면: 월별 시계열 데이터 적재 필요
```

### 오버레이 차트에 선이 안 보임

```bash
# internal_capa/waferInput/utilization 데이터 확인
sqlite3 data/dashboard.db "SELECT customer, category, COUNT(*) FROM metrics WHERE category LIKE 'internal_%' GROUP BY customer, category"
# → 특정 회사 행이 없으면 해당 회사 데이터 적재 필요
```

### 투입량이 비정상적으로 작거나 큼

```bash
# 투입량/CAPA 비율 확인
npx tsx scripts/validate.ts
# → "투입량/CAPA 비율 XX%" 경고 확인
# → 투입량은 CAPA의 60~100% 범위여야 정상 (가동률 = 투입량/CAPA)
```

### Foundry 노드별 가동률이 안 보임

```bash
sqlite3 data/dashboard.db "SELECT COUNT(*) FROM metrics WHERE category='foundry_node'"
# → 0이면: Foundry 노드 데이터 적재 필요 (섹션 4-1 foundry_node 참고)
```

### Server 선행지표 / Memory Price 탭이 비어있음

```bash
sqlite3 data/dashboard.db "SELECT category, COUNT(*) FROM metrics WHERE category IN ('server_indicator','memory_price') GROUP BY category"
# → 해당 category 행이 없으면 적재 필요
```

### 고객 탭에 고객이 안 보임

```bash
# customerList 메타 확인
sqlite3 data/dashboard.db "SELECT customer, metadata FROM metrics WHERE category='customerList'"
# → 빈 결과면: 고객 목록 메타데이터 적재 필요 (섹션 4-3 참고)
```

### Postgres 사용 중인데 SQLite에만 데이터가 있음

```bash
# .env.local에서 DB 모드 확인
grep POSTGRES_URL .env.local
# → POSTGRES_URL이 있으면 Postgres에서 데이터를 읽음
# → Postgres에도 시드 필요:
npx tsx scripts/seed-postgres.ts
```

### 브라우저에서 변경이 안 보임

1. **하드 리프레시**: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
2. **dev 서버 재시작**: `Ctrl+C` 후 `npm run dev`
3. **빌드 캐시 삭제**: `rm -rf .next && npm run dev`
