import { SupplyChainCategory, InternalCompanyData, InternalMetricType } from '@/types/v2';

// ── Dynamic month generation based on today's date ──────────────────────────
const MONTH_COUNT = 6;

function getRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

/** Exported for use in IndicatorTable header.
 *  WARNING: uses new Date() at module scope — safe only because all consumers are 'use client'. */
export const DYNAMIC_MONTHS = getRecentMonths(MONTH_COUNT);

// Deterministic seed-based pseudo-random to avoid SSR hydration mismatch
function seededValue(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function genMonthly(baseValues: number[]) {
  return DYNAMIC_MONTHS.map((month, i) => {
    const seed = baseValues[0] * 100 + i;
    return {
      month,
      actual: baseValues[i],
      threeMonthMA: +(baseValues[i] * (0.95 + seededValue(seed) * 0.1)).toFixed(1),
      twelveMonthMA: +(baseValues[i] * (0.9 + seededValue(seed + 50) * 0.2)).toFixed(1),
      mom: +((seededValue(seed + 100) - 0.4) * 20).toFixed(1),
      yoy: +((seededValue(seed + 150) - 0.3) * 40).toFixed(1),
    };
  });
}

export const SUPPLY_CHAIN_CATEGORIES: SupplyChainCategory[] = [
  {
    id: 'wafer',
    label: 'Wafer',
    indicators: [
      {
        id: 'A',
        name: '300mm Wafer Shipment',
        unit: 'M',
        monthly: genMonthly([6.5, 6.8, 7.1, 6.9, 7.3, 7.2]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.2 },
        judgment: 'AI 서버향 수요 증가로 출하량 지속 상승 추세',
        leadingRating: '상',
      },
      {
        id: 'B',
        name: '300mm Wafer ASP',
        unit: 'K',
        monthly: genMonthly([0.82, 0.88, 0.91, 0.87, 0.84, 0.86]),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: -1.3 },
        judgment: '공급 과잉 해소 지연으로 가격 소폭 약세 유지',
        leadingRating: '중',
      },
      {
        id: 'C',
        name: 'Wafer Inventory (Weeks)',
        unit: 'K',
        monthly: genMonthly([4.2, 3.8, 3.5, 3.9, 3.7, 3.6]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 2.1 },
        judgment: '재고 수준 점진적 감소로 수급 개선 신호 확인',
        leadingRating: '상',
      },
      {
        id: 'D',
        name: 'Utilization Rate',
        unit: '%',
        monthly: genMonthly([80, 82, 85, 83, 86, 87]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.6 },
        judgment: '가동률 꾸준한 상승으로 수요 회복 동행 확인',
        leadingRating: '중',
      },
      {
        id: 'E',
        name: '200mm Wafer Shipment',
        unit: 'M',
        monthly: genMonthly([2.0, 1.9, 2.2, 2.1, 2.3, 2.1]),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: 0.8 },
        judgment: '산업용·차량용 수요 완만한 증가, 레거시 공정 안정적',
        leadingRating: '중',
      },
      {
        id: 'F',
        name: 'SOI Wafer Demand',
        unit: 'K',
        monthly: genMonthly([125, 130, 128, 135, 140, 138]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.4 },
        judgment: '차량용 반도체 확대로 SOI 수요 구조적 성장',
        leadingRating: '상',
      },
    ],
  },
  {
    id: 'macro',
    label: 'Macro',
    indicators: [
      {
        id: 'A',
        name: 'GDP Growth (Global)',
        unit: '%',
        monthly: genMonthly([3.1, 3.3, 3.0, 2.9, 3.2, 3.4]),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: 0.5 },
        judgment: '글로벌 성장세 완만, 반도체 수요 기저 지지',
        leadingRating: '상',
      },
      {
        id: 'B',
        name: 'PMI (Manufacturing)',
        unit: 'K',
        monthly: genMonthly([50.8, 52.1, 51.5, 50.3, 52.4, 51.9]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 1.2 },
        judgment: 'PMI 50 이상 유지, 제조업 확장 국면 지속',
        leadingRating: '상',
      },
      {
        id: 'C',
        name: 'USD/KRW Exchange Rate',
        unit: 'K',
        monthly: genMonthly([1335, 1310, 1345, 1360, 1325, 1350]),
        semiAnnualEval: { half: 'H2', rating: 'negative', value: -2.3 },
        judgment: '원화 약세 지속으로 수출 단가 상승 효과 발생',
        leadingRating: '중',
      },
      {
        id: 'D',
        name: 'Fed Funds Rate',
        unit: '%',
        monthly: genMonthly([5.25, 5.25, 5.25, 5.00, 4.75, 4.75]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 1.8 },
        judgment: '금리 인하 사이클 진입으로 IT 투자 심리 회복',
        leadingRating: '상',
      },
      {
        id: 'E',
        name: 'CPI (US)',
        unit: '%',
        monthly: genMonthly([3.3, 3.0, 2.9, 2.5, 2.6, 2.7]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 2.4 },
        judgment: '인플레이션 둔화로 소비 여건 개선, 수요 기대 상승',
        leadingRating: '상',
      },
      {
        id: 'F',
        name: 'Semiconductor CapEx Index',
        unit: 'M',
        monthly: genMonthly([108, 112, 110, 115, 120, 122]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.1 },
        judgment: '주요 업체 CapEx 회복, 중장기 공급 확대 시그널',
        leadingRating: '상',
      },
    ],
  },
  {
    id: 'application',
    label: 'Application',
    indicators: [
      {
        id: 'A',
        name: 'Server Shipment',
        unit: 'M',
        monthly: genMonthly([3.9, 4.1, 4.3, 4.2, 4.4, 4.6]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 6.2 },
        judgment: 'AI 인프라 투자 가속화로 서버 출하 강한 상승세',
        leadingRating: '상',
      },
      {
        id: 'B',
        name: 'Smartphone Shipment',
        unit: 'M',
        monthly: genMonthly([102, 105, 110, 108, 115, 120]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.8 },
        judgment: 'AI 스마트폰 전환 수요로 교체 사이클 진입 확인',
        leadingRating: '중',
      },
      {
        id: 'C',
        name: 'PC Shipment',
        unit: 'M',
        monthly: genMonthly([21, 23, 24, 22, 24, 26]),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: 1.5 },
        judgment: 'AI PC 출시로 완만한 교체 수요 촉진, 방향성 긍정',
        leadingRating: '중',
      },
      {
        id: 'D',
        name: 'Automotive Semiconductor',
        unit: 'M',
        monthly: genMonthly([5.4, 5.6, 5.8, 5.5, 6.1, 6.3]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.5 },
        judgment: 'EV 전장화 확대로 차량용 반도체 구조적 수요 성장',
        leadingRating: '상',
      },
      {
        id: 'E',
        name: 'AI Accelerator Shipment',
        unit: 'K',
        monthly: genMonthly([480, 520, 560, 540, 620, 650]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 12.3 },
        judgment: 'GPU·NPU 수요 폭발적 성장, HBM 수요 직결 핵심 지표',
        leadingRating: '상',
      },
      {
        id: 'F',
        name: 'IoT Device Shipment',
        unit: 'M',
        monthly: genMonthly([15.8, 16.1, 16.5, 16.2, 17.1, 17.5]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.2 },
        judgment: '산업·가전용 IoT 확산으로 레거시 반도체 수요 지지',
        leadingRating: '중',
      },
    ],
  },
  {
    id: 'semiconductor',
    label: 'Semiconductor',
    indicators: [
      {
        id: 'A',
        name: 'DRAM Revenue',
        unit: 'M',
        monthly: genMonthly([8500, 8800, 9100, 8900, 9500, 9800]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 8.5 },
        judgment: 'DDR5 전환 및 HBM 믹스 개선으로 매출 고성장 지속',
        leadingRating: '하',
      },
      {
        id: 'B',
        name: 'NAND Revenue',
        unit: 'M',
        monthly: genMonthly([6000, 6200, 6500, 6300, 6800, 7000]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.3 },
        judgment: 'SSD 수요 회복 및 가격 반등으로 매출 회복 궤도',
        leadingRating: '하',
      },
      {
        id: 'C',
        name: 'Logic IC Revenue',
        unit: 'M',
        monthly: genMonthly([12300, 12500, 12800, 12600, 13200, 13500]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.2 },
        judgment: 'AI 칩 수요 견인으로 파운드리·로직 매출 안정 성장',
        leadingRating: '하',
      },
      {
        id: 'D',
        name: 'DRAM ASP',
        unit: 'K',
        monthly: genMonthly([3.4, 3.5, 3.7, 3.6, 3.9, 4.1]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 7.8 },
        judgment: '공급 제한 및 HBM 수요 프리미엄으로 ASP 상승 지속',
        leadingRating: '중',
      },
      {
        id: 'E',
        name: 'NAND ASP (per GB)',
        unit: 'K',
        monthly: genMonthly([0.082, 0.085, 0.088, 0.086, 0.092, 0.095]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 6.1 },
        judgment: '재고 감소 및 수급 균형 회복으로 NAND ASP 반등',
        leadingRating: '중',
      },
      {
        id: 'F',
        name: 'HBM Revenue',
        unit: 'M',
        monthly: genMonthly([1350, 1500, 1650, 1800, 2100, 2250]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 18.5 },
        judgment: 'AI 가속기 탑재 HBM 수요 폭증, 초고성장 지속',
        leadingRating: '중',
      },
    ],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    indicators: [
      {
        id: 'A',
        name: 'WFE (Wafer Fab Equipment)',
        unit: 'M',
        monthly: genMonthly([7800, 8000, 8200, 8100, 8600, 8800]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.8 },
        judgment: '주요 파운드리·메모리 CapEx 집행으로 WFE 성장세',
        leadingRating: '상',
      },
      {
        id: 'B',
        name: 'Lithography Equipment',
        unit: 'M',
        monthly: genMonthly([2900, 3000, 3100, 3050, 3300, 3400]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.3 },
        judgment: 'EUV 장비 수요 증가로 선단 공정 투자 확대 선행',
        leadingRating: '상',
      },
      {
        id: 'C',
        name: 'Etch Equipment',
        unit: 'M',
        monthly: genMonthly([1550, 1600, 1650, 1620, 1720, 1760]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.7 },
        judgment: '적층 구조 증가로 식각 장비 수요 구조적 성장',
        leadingRating: '상',
      },
      {
        id: 'D',
        name: 'Deposition Equipment',
        unit: 'M',
        monthly: genMonthly([1250, 1300, 1350, 1320, 1420, 1460]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.2 },
        judgment: '박막 증착 공정 고도화에 따른 증착 장비 수요 확대',
        leadingRating: '상',
      },
      {
        id: 'E',
        name: 'CMP Equipment',
        unit: 'M',
        monthly: genMonthly([470, 490, 510, 500, 540, 560]),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: 2.1 },
        judgment: '선단 공정 수율 관리 중요성 증가로 CMP 수요 동행',
        leadingRating: '중',
      },
      {
        id: 'F',
        name: 'Inspection Equipment',
        unit: 'M',
        monthly: genMonthly([830, 860, 890, 870, 940, 970]),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.9 },
        judgment: '공정 복잡도 증가로 결함 검사 장비 수요 지속 확대',
        leadingRating: '중',
      },
    ],
  },
];

// ── Internal company mock data ──────────────────────────────────────────────

function genMetric(base: number[]): { month: string; value: number }[] {
  return DYNAMIC_MONTHS.map((month, i) => ({ month, value: base[i] }));
}

export const INTERNAL_COMPANY_DATA: Record<string, InternalCompanyData> = {
  // Memory
  SEC: {
    id: 'SEC',
    name: 'SEC',
    metrics: {
      revenue: genMetric([9500, 9800, 10100, 9900, 10700, 11000]),
      waferInput: genMetric([530, 545, 555, 540, 570, 580]),
      utilization: genMetric([84, 86, 88, 85, 87, 90]),
    },
  },
  'SK Hynix': {
    id: 'SK Hynix',
    name: 'SK Hynix',
    metrics: {
      revenue: genMetric([4950, 5100, 5350, 5200, 5700, 5900]),
      waferInput: genMetric([285, 295, 305, 298, 318, 325]),
      utilization: genMetric([82, 84, 87, 83, 86, 89]),
    },
  },
  Micron: {
    id: 'Micron',
    name: 'Micron',
    metrics: {
      revenue: genMetric([3750, 3900, 4050, 3950, 4350, 4500]),
      waferInput: genMetric([205, 215, 220, 212, 232, 238]),
      utilization: genMetric([80, 83, 85, 82, 84, 87]),
    },
  },
  // Foundry
  TSMC: {
    id: 'TSMC',
    name: 'TSMC',
    metrics: {
      revenue: genMetric([18500, 19200, 19800, 19400, 20800, 21500]),
      waferInput: genMetric([1070, 1100, 1130, 1110, 1180, 1210]),
      utilization: genMetric([89, 91, 92, 90, 92, 94]),
    },
  },
  SMIC: {
    id: 'SMIC',
    name: 'SMIC',
    metrics: {
      revenue: genMetric([1850, 1900, 1950, 1920, 2020, 2060]),
      waferInput: genMetric([133, 137, 141, 138, 147, 150]),
      utilization: genMetric([74, 76, 78, 75, 77, 80]),
    },
  },
  GFs: {
    id: 'GFs',
    name: 'GFs',
    metrics: {
      revenue: genMetric([1230, 1260, 1290, 1270, 1340, 1370]),
      waferInput: genMetric([92, 94, 97, 95, 101, 103]),
      utilization: genMetric([72, 74, 76, 73, 75, 78]),
    },
  },
};

export const OVERLAY_COLORS: Record<string, string> = {
  SEC: '#f59e0b',
  'SK Hynix': '#06b6d4',
  Micron: '#8b5cf6',
  TSMC: '#10b981',
  SMIC: '#ef4444',
  GFs: '#f97316',
};

export function buildOverlayData(
  companies: string[],
  metric: InternalMetricType,
): { name: string; data: { month: string; value: number }[]; color: string }[] {
  return companies
    .filter((c) => INTERNAL_COMPANY_DATA[c])
    .map((c) => ({
      name: `${c} (${metric})`,
      data: INTERNAL_COMPANY_DATA[c].metrics[metric],
      color: OVERLAY_COLORS[c] ?? '#64748b',
    }));
}
