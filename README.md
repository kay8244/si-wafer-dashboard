# MI Platform 현황판

반도체 시장 분석 대시보드 — 전방시장 지표, 웨이퍼 수요예측(VCM), 고객별 상세 분석을 시각화합니다.

## 기술 스택

| 항목 | 버전 |
|------|------|
| Next.js (App Router) | 16.1 |
| React | 19 |
| Recharts | 3.7 |
| Tailwind CSS | 4.1 |
| TypeScript | 5.9 |

## 환경 변수 (.env.local)

```
ANTHROPIC_API_KEY=      # Anthropic API 키 (뉴스 AI 요약용)
DART_API_KEY=           # DART 공시 API 키 (분석 페이지용, 없으면 데모 폴백)
```

## 실행

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # 프로덕션 빌드 (에러 검증용)
```

---

## 라우트 구조

```
/                              ← [현황판] 이 문서의 주요 설명 대상
├── 탭1: 전방시장               → SupplyChainPage
├── 탭2: VCM (수요예측)         → VcmPage
├── 탭3: 고객별                 → CustomerDetailPage
└── [링크] "경쟁사/고객실적" → /analysis

/analysis                      ← [분석 페이지] 수정 불필요 영역
├── 탭1: 경쟁사 분석            → DashboardContainer
└── 탭2: 고객 분석              → CustomerAnalysisContainer (DRAM/NAND/Foundry)
```

---

## 현황판 탭 구성

### 탭1: 전방시장 (`components/supply-chain/`)

매크로/반도체/장비/어플리케이션 카테고리별 시장 지표를 테이블+차트로 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `SupplyChainPage.tsx` | 메인 페이지 (사이드바 + 테이블 + 차트 조합) |
| `CategorySidebar.tsx` | 좌측 카테고리 선택 (매크로/반도체/장비/앱) |
| `IndicatorTable.tsx` | 지표 테이블 (Actual, 3MMA, 12MMA, MoM, YoY 뷰 전환) |
| `IndicatorChart.tsx` | 지표 라인차트 (Recharts) |

**데이터 소스**: `src/data/supply-chain-mock.ts` (하드코딩)

### 탭2: VCM — 수요예측 (`components/vcm/`)

Application별·Device별 웨이퍼 수요를 예측 차트/테이블로 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `VcmPage.tsx` | 메인 페이지 (필터, InlineNews, WaferDemandAnalysis 인라인 포함) |
| `TotalWaferLineChart.tsx` | 총 웨이퍼 수요 라인차트 (PW/EPI 구분, QoQ 기본 ON) |
| `DemandBarChart.tsx` | Application 수요 막대차트 + 탑재량 테이블 (QoQ 기본 ON) |
| `DeviceStackedChart.tsx` | Device별 Stacked 영역차트 (QoQ 기본 ON) |

> **뉴스 토글**: 상단 "뉴스" 버튼으로 AI 뉴스 요약 패널 ON/OFF (기본: OFF)

**데이터 소스**: `src/data/vcm-mock.ts` (하드코딩)

### 탭3: 고객별 (`components/customer-detail/`)

Memory(DRAM/NAND) 및 Foundry 고객사별 KPI, 월별 지표, 외부 추정치 비교 등을 표시합니다.

| 컴포넌트 | 역할 |
|---------|------|
| `CustomerDetailPage.tsx` | 메인 (상단 탭으로 고객사 전환, Memory/Foundry 그룹) |
| `ExecutivePanel.tsx` | 경영진 요약 (KPI 카드, Product Mix, Scrap Rate) |
| `MonthlyMetricsChart.tsx` | 월별 지표 차트 (투입량/구매량/재고/가동률) |
| `ExternalComparison.tsx` | 외부 추정치 비교 테이블 |
| `WeeklySummary.tsx` | 주간 요약 코멘트 |
| `EstimateTrendChart.tsx` | Estimate 트렌드 차트 (UBS/TrendForce 비교) |
| `CustomerNewsPanel.tsx` | 고객사 AI 뉴스 요약 |

> **뉴스 토글**: 상단 "뉴스" 버튼으로 뉴스 패널 ON/OFF (기본: OFF)

**데이터 소스**: `src/data/customer-detail-mock.ts` (하드코딩)

---

## 데이터 적재 방법 (핵심)

현황판의 3개 탭은 모두 **`src/data/` 폴더의 TypeScript Mock 파일**에서 데이터를 읽습니다.
API 연동이 아닌 하드코딩 방식이므로, 데이터 갱신 시 해당 파일을 직접 수정해야 합니다.

### Mock 데이터 파일 구조

```
src/data/
├── supply-chain-mock.ts    ← 탭1: 전방시장
├── vcm-mock.ts             ← 탭2: VCM 수요예측
└── customer-detail-mock.ts ← 탭3: 고객별 상세
```

### 1) `supply-chain-mock.ts` — 전방시장 지표

```ts
// 카테고리 구조: wafer | macro | application | semiconductor | equipment
export const SUPPLY_CHAIN_CATEGORIES: SupplyChainCategory[] = [
  {
    id: 'macro',
    label: '매크로',
    indicators: [
      {
        id: 'gdp',
        name: 'GDP 성장률',
        unit: '%',
        monthly: [
          { month: '2024-01', actual: 3.2, threeMonthMA: 3.1, twelveMonthMA: 3.0, mom: 0.1, yoy: 0.5 },
          // ... 월별 데이터 추가
        ],
        judgment: '긍정적',           // 반기 판단
        leadingRating: '상',          // 선행지표 등급 (상/중상/중/중하/하)
        ratingReason: '...',          // 등급 사유
      },
      // ... 지표 추가
    ],
  },
  // ... 카테고리 추가
];
```

**데이터 갱신 방법**: `indicators[].monthly[]` 배열에 새 월 데이터를 추가합니다.

### 2) `vcm-mock.ts` — VCM 수요예측

```ts
export const VCM_DATA: VcmData = {
  versions: [{ id: 'v1', label: '2026.02', date: '2026-02-01' }],

  // Application별 수요 (서버, 스마트폰, PC, 차량, IoT 등)
  applicationDemands: {
    traditionalServer: {
      label: '전통 서버',
      yearly: [{ year: 2024, value: 1200, isEstimate: false }, ...]
    },
    // ...
  },

  // Device별 웨이퍼 수요 (DRAM, HBM, NAND, Foundry 등)
  deviceWaferDemands: { ... },

  // 총 웨이퍼 수요 (연도별/분기별)
  totalWaferDemand: [{ year: 2024, total: 15000, isEstimate: false }, ...],
  totalWaferQuarterly: [{ quarter: '24Q1', total: 3700, pw: 2800, epi: 900, isEstimate: false }, ...],

  // Application별 뉴스 검색 쿼리 (Google News RSS + AI 요약에 사용)
  newsQueries: {
    traditionalServer: { queryKo: '서버 반도체 수요', queryEn: 'server semiconductor demand' },
    // ...
  },
};
```

**데이터 갱신 방법**: `yearly[]`에 새 연도, `totalWaferQuarterly[]`에 새 분기 추가. `isEstimate: true`로 표시하면 차트에서 점선으로 표현됩니다.

### 3) `customer-detail-mock.ts` — 고객별 상세

```ts
// 고객 목록: Memory (SEC, SKHynix, Micron, Koxia) + Foundry (SEC, TSMC, SMC, GFS, STM, Intel)
export const CUSTOMER_EXECUTIVES: CustomerExecutive[] = [
  {
    customerId: 'SEC',
    label: 'SEC (DRAM/NAND)',
    type: 'memory',
    productMix: [{ category: 'DRAM', percentage: 60, color: '#3B82F6' }, ...],
    kpiMetrics: [{ label: '투입량', value: '120K', unit: 'wpm' }, ...],
    monthlyMetrics: [
      { month: '2025-01', waferInput: 120, purchaseVolume: 85, inventoryMonths: 2.1, utilization: 92, ... },
      // ...
    ],
    waferInOutQuarterly: [
      { quarter: '24Q1', waferIn: 350, waferOut: 340, isEstimate: false, dramRatio: 0.65 },
      // ...
    ],
    bitGrowthQuarterly: [{ quarter: '24Q1', growth: 5.2, isEstimate: false }, ...],
    news: [{ source: '전자신문', date: '2025-03-01', title: '...', categories: ['투입량'] }, ...],
    weeklySummary: { weekLabel: 'W10', comment: '...' },
    // ...
  },
  // ... 다른 고객사
];
```

**데이터 갱신 방법**:
- `monthlyMetrics[]`: 새 월 데이터 추가
- `waferInOutQuarterly[]`: 새 분기 웨이퍼 In/Out 추가
- `bitGrowthQuarterly[]`: 새 분기 Bit Growth 추가
- `news[]`: 최신 뉴스 항목 추가
- `weeklySummary`: 주간 요약 코멘트 갱신

---

## 현황판 데이터 흐름

```
src/data/ (TypeScript Mock)                    현황판 컴포넌트
┌──────────────────────────┐          ┌──────────────────────────────┐
│ supply-chain-mock.ts     │ ──────→  │ supply-chain/SupplyChainPage │
│ (매크로/반도체/장비/앱)    │  import  │ + CategorySidebar            │
│                          │          │ + IndicatorTable/Chart       │
├──────────────────────────┤          ├──────────────────────────────┤
│ vcm-mock.ts              │ ──────→  │ vcm/VcmPage                  │
│ (Application/Device별    │  import  │ + TotalWaferLineChart        │
│  수요, 탑재량, 분기별)    │          │ + DemandBarChart             │
│                          │          │ + DeviceStackedChart         │
├──────────────────────────┤          ├──────────────────────────────┤
│ customer-detail-mock.ts  │ ──────→  │ customer-detail/             │
│ (고객별 KPI, ProductMix, │  import  │   CustomerDetailPage         │
│  월별지표, 웨이퍼In/Out)  │          │ + ExecutivePanel             │
│                          │          │ + MonthlyMetricsChart        │
└──────────────────────────┘          └──────────────────────────────┘

                                      ※ VCM + 고객별 탭에서 /api/news 호출
                                        (Google News RSS → Claude Haiku 요약)
                                        뉴스 버튼 토글로 ON/OFF (기본: OFF)
```

### 뉴스 AI 요약 흐름 (VCM + 고객별 탭)

뉴스 패널은 **기본 OFF**이며, 각 탭 상단의 "뉴스" 토글 버튼으로 켜고 끌 수 있습니다.

```
vcm-mock.ts의 newsQueries / customer-detail-mock.ts의 newsQuery
        │
        ▼
GET /api/news?q=서버+반도체+수요&qEn=server+semiconductor+demand
        │
        ▼
Google News RSS 검색 (한국어 + 영어)
        │
        ▼
Anthropic Claude Haiku 4.5 요약 생성
        │
        ▼
cache/news-*.json (24시간 TTL)
        │
        ▼
VCM: InlineNews + WaferDemandAnalysis (VcmPage 내부)
고객별: CustomerNewsPanel
```

---

## 폴더 구조 (현황판 중심)

```
01_MI_Platform_Dashboard/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 루트 레이아웃
│   │   ├── globals.css            # 전역 CSS (Tailwind 4.1)
│   │   ├── page.tsx               # "/" → V3Container (현황판 진입점)
│   │   ├── analysis/page.tsx      # "/analysis" (수정 불필요)
│   │   └── api/
│   │       └── news/route.ts      # GET /api/news (뉴스 AI 요약)
│   │       # ※ api/financials, api/dram-customers 등은 분석 페이지용 (수정 불필요)
│   │
│   ├── data/                      # ★ 현황판 핵심 데이터 (수정 대상)
│   │   ├── supply-chain-mock.ts   #   탭1 전방시장: 카테고리별 월간 지표
│   │   ├── vcm-mock.ts            #   탭2 VCM: 수요예측, 탑재량, 분기별 웨이퍼
│   │   └── customer-detail-mock.ts#   탭3 고객별: KPI, ProductMix, 월별지표, 웨이퍼In/Out
│   │
│   ├── components/
│   │   ├── V3Container.tsx        # 현황판 메인 컨테이너 (3탭 전환)
│   │   ├── supply-chain/          # 탭1 전방시장 (4개 컴포넌트)
│   │   ├── vcm/                   # 탭2 VCM 수요예측 (4개 컴포넌트)
│   │   ├── customer-detail/       # 탭3 고객별 상세 (7개 컴포넌트)
│   │   │
│   │   # --- 아래는 /analysis 페이지용 (수정 불필요) ---
│   │   ├── customer-shared/       # 공통 Generic 차트 (7개)
│   │   ├── dashboard/             # 경쟁사 분석 (9개)
│   │   └── customer/              # 고객 분석 DRAM/NAND/Foundry (34개)
│   │
│   ├── types/
│   │   └── indicators.ts         # ★ 현황판 타입 정의 (SupplyChain, VCM, CustomerDetail)
│   │   # ※ company.ts, customer.ts 등은 분석 페이지용
│   │
│   ├── hooks/
│   │   ├── useNews.ts             # 범용 뉴스 fetch hook (VCM 뉴스에 사용)
│   │   ├── useDarkMode.ts         # 다크모드 토글
│   │   # ※ useFinancialData, useDramCustomerData 등은 분석 페이지용
│   │
│   └── lib/
│       ├── cache.ts               # 파일+메모리 듀얼 캐시 (24시간 TTL)
│       ├── news-utils.tsx         # 뉴스 유틸
│       ├── chart-utils.tsx        # Recharts 공통 유틸
│       ├── format.ts              # 숫자/통화 포맷
│       # ※ yahoo-client, dart-client, transform, growth, constants 등은 분석 페이지용
│
├── cache/                         # 런타임 캐시 (자동 생성, TTL 24시간)
│   └── news-*.json                # 뉴스 요약 캐시 (현황판에서 사용)
│   # ※ financials_all.json, dram_customers.json 등은 분석 페이지용
│
├── data/                          # 분석 페이지용 정적 JSON (수정 불필요)
│   # dram-customers.json, nand-customers.json, foundry-customers.json
│
├── package.json
├── next.config.ts
└── .gitignore
```

---

## 타입 참조 (`src/types/indicators.ts`)

현황판에서 사용하는 주요 타입들입니다. 데이터 수정 시 이 타입을 참고하세요.

### 전방시장 (탭1)

```ts
type SupplyChainCategoryId = 'wafer' | 'macro' | 'application' | 'semiconductor' | 'equipment';
type ViewMode = 'actual' | 'threeMonthMA' | 'twelveMonthMA' | 'mom' | 'yoy';
type LeadingIndicatorRating = '상' | '중상' | '중' | '중하' | '하';

interface MonthlyData {
  month: string;       // "2024-01"
  actual: number;
  threeMonthMA: number;
  twelveMonthMA: number;
  mom: number;         // 전월비 (%)
  yoy: number;         // 전년비 (%)
}
```

### VCM (탭2)

```ts
type ApplicationType = 'traditionalServer' | 'aiServer' | 'smartphone' | 'pcNotebook'
                     | 'electricVehicle' | 'ioe' | 'automotive';
type DeviceType = 'dram' | 'hbm' | 'nand' | 'otherMemory' | 'foundry'
               | 'logic' | 'analog' | 'discrete' | 'sensor';

interface TotalWaferQuarterlyEntry {
  quarter: string;     // "24Q1"
  total: number;
  pw: number;          // Polished Wafer
  epi: number;         // Epitaxial Wafer
  isEstimate: boolean; // true면 차트에서 점선 표시
}
```

### 고객별 (탭3)

```ts
type MemoryCustomerId = 'SEC' | 'SKHynix' | 'Micron' | 'Koxia';
type FoundryCustomerId = 'SEC_Foundry' | 'TSMC' | 'SMC' | 'GFS' | 'STM' | 'Intel';

interface MonthlyMetricData {
  month: string;        // "2025-01"
  waferInput: number;   // 투입량
  purchaseVolume: number; // 구매량
  inventoryMonths: number; // 재고월수
  utilization: number;  // 가동률 (%)
  inventoryLevel: number;
  capa: number;
  dramRatio?: number;   // DRAM 비중
}

interface WaferInOutQuarterlyEntry {
  quarter: string;      // "24Q1"
  waferIn: number;
  waferOut: number;
  isEstimate: boolean;
  dramRatio?: number;
}
```
