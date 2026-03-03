import { SupplyChainCategory, InternalCompanyData, InternalMetricType } from '@/types/v3';

// ── Dynamic month generation based on today's date ──────────────────────────
const FULL_MONTH_COUNT = 36;
const TABLE_MONTH_COUNT = 6;

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

/** Full 36-month range for charts */
export const DYNAMIC_MONTHS = getRecentMonths(FULL_MONTH_COUNT);
/** Last 6 months for the indicator table display */
export const TABLE_MONTHS = DYNAMIC_MONTHS.slice(-TABLE_MONTH_COUNT);

// Deterministic seed-based pseudo-random to avoid SSR hydration mismatch
function seededValue(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a 36-point time series between startVal and endVal with
 * deterministic noise controlled by volatilityPct and seed.
 */
function generateTimeSeries(
  startVal: number,
  endVal: number,
  volatilityPct: number,
  seed: number,
): number[] {
  const values: number[] = [];
  for (let i = 0; i < FULL_MONTH_COUNT; i++) {
    const progress = i / (FULL_MONTH_COUNT - 1);
    const trend = startVal + (endVal - startVal) * progress;
    const noise = (seededValue(seed + i * 7) - 0.5) * 2 * volatilityPct * Math.abs(trend);
    values.push(trend + noise);
  }
  return values;
}

/**
 * Build MonthlyData[] from raw values with proper 3MMA, 12MMA, MoM%, YoY%.
 */
function genMonthly(baseValues: number[]) {
  return DYNAMIC_MONTHS.map((month, i) => {
    const val = baseValues[i];

    // 3-month moving average
    let threeMA = val;
    if (i >= 2) {
      threeMA = (baseValues[i] + baseValues[i - 1] + baseValues[i - 2]) / 3;
    } else if (i === 1) {
      threeMA = (baseValues[i] + baseValues[i - 1]) / 2;
    }

    // 12-month moving average
    let twelveMA = val;
    if (i >= 11) {
      twelveMA = baseValues.slice(i - 11, i + 1).reduce((a, b) => a + b, 0) / 12;
    } else if (i > 0) {
      twelveMA = baseValues.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
    }

    // MoM %
    const prev = i > 0 ? baseValues[i - 1] : 0;
    const mom = i > 0 && prev !== 0 ? ((val - prev) / Math.abs(prev)) * 100 : 0;

    // YoY %
    const prevYear = i >= 12 ? baseValues[i - 12] : 0;
    const yoy = i >= 12 && prevYear !== 0 ? ((val - prevYear) / Math.abs(prevYear)) * 100 : 0;

    return {
      month,
      actual: +val.toFixed(2),
      threeMonthMA: +threeMA.toFixed(2),
      twelveMonthMA: +twelveMA.toFixed(2),
      mom: +mom.toFixed(1),
      yoy: +yoy.toFixed(1),
    };
  });
}

// ── Helper: shorthand for generating monthly data from start/end/vol/seed ──
function gen(start: number, end: number, vol: number, seed: number) {
  return genMonthly(generateTimeSeries(start, end, vol, seed));
}

// ── Supply Chain Categories (matching reference image) ──────────────────────

export const SUPPLY_CHAIN_CATEGORIES: SupplyChainCategory[] = [
  // ────────────────────────────── Macro ──────────────────────────────
  {
    id: 'macro',
    label: 'Macro',
    indicators: [
      {
        id: 'A',
        name: 'OECD CLI',
        unit: 'Index',
        monthly: gen(98.8, 100.6, 0.003, 101),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 1.2 },
        judgment: 'OECD 경기선행지수 100 회복, 글로벌 경기 확장 국면 진입 시사',
        leadingRating: '상',
        ratingReason: '경기선행지수는 반도체 수요와 6~9개월 선행 상관관계가 높은 핵심 거시 선행지표',
      },
      {
        id: 'B',
        name: 'Manufacturing PMI',
        unit: 'Index',
        monthly: gen(47.5, 52.8, 0.02, 102),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 2.8 },
        judgment: 'PMI 50 상회 안착, 글로벌 제조업 확장 국면 전환 확인',
        leadingRating: '중상',
        ratingReason: '제조업 경기를 실시간 반영하며 반도체 수주와 높은 동행성을 보이나, 서비스업 비중 증가로 설명력 다소 감소',
      },
      {
        id: 'C',
        name: 'Hyperscaler Capex Trends',
        unit: '$B',
        monthly: gen(32, 65, 0.04, 103),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 18.5 },
        judgment: 'AI 인프라 투자 폭증, 빅테크 CapEx 사상 최대 수준 경신',
        leadingRating: '상',
        ratingReason: '빅테크 CapEx는 서버 DRAM/HBM 수요의 직접적 선행지표로, AI 시대 가장 강력한 수요 신호',
      },
    ],
  },
  // ────────────────────────────── Application ──────────────────────────────
  {
    id: 'application',
    label: 'Application',
    indicators: [
      {
        id: 'A',
        name: 'Smartphone Shipment',
        unit: 'M units',
        monthly: gen(92, 112, 0.03, 201),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.2 },
        judgment: 'AI 스마트폰 전환 수요 견인으로 출하량 완만한 회복세',
        leadingRating: '중',
        ratingReason: '스마트폰은 DRAM/NAND 최대 소비처이나 성숙시장으로 성장률 제한적, 탑재량 증가가 핵심 변수',
      },
      {
        id: 'B',
        name: 'PC Shipment',
        unit: 'M units',
        monthly: gen(18, 25, 0.035, 202),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 3.8 },
        judgment: 'AI PC 교체 사이클 진입, Win10 EOS 효과로 출하 증가',
        leadingRating: '중하',
        ratingReason: 'PC 출하량은 메모리 수요의 동행지표이나, 전체 비중 감소 추세로 선행 설명력 약화',
      },
      {
        id: 'C',
        name: 'Electric Vehicle/EV Shipment',
        unit: 'M units',
        monthly: gen(1.2, 3.4, 0.04, 203),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 12.3 },
        judgment: 'EV 침투율 지속 상승, 차량용 반도체 수요 구조적 성장 동인',
        leadingRating: '중상',
        ratingReason: 'EV 침투율은 차량용 반도체(CIS, MCU, 전력반도체) 수요의 구조적 선행지표, 웨이퍼 수요에 직접 영향',
      },
    ],
  },
  // ────────────────────────────── Semiconductor ──────────────────────────────
  {
    id: 'semiconductor',
    label: 'Semiconductor',
    indicators: [
      {
        id: 'A',
        name: 'Memory Price - DDR4 16Gb',
        unit: '$',
        monthly: gen(0.95, 1.85, 0.04, 301),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 8.5 },
        judgment: 'DDR4 수급 타이트닝으로 가격 반등, 레거시 수요 안정적',
        leadingRating: '중상',
        ratingReason: 'DRAM 현물가격은 메모리 업황의 핵심 동행/선행지표로, 수급 밸런스를 실시간 반영',
      },
      {
        id: 'B',
        name: 'Memory Price - DDR5 16Gb',
        unit: '$',
        monthly: gen(5.2, 3.6, 0.035, 302),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: -2.1 },
        judgment: 'DDR5 양산 확대로 가격 하락 추세, 원가 경쟁력 확보 관건',
        leadingRating: '중',
        ratingReason: 'DDR5는 아직 양산 초기로 가격 변동이 기술 전환 영향이 크며, 수급보다는 채택률이 주요 변수',
      },
      {
        id: 'C',
        name: 'NAND 512Gb TLC',
        unit: '$',
        monthly: gen(1.8, 2.9, 0.04, 303),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 6.3 },
        judgment: 'NAND 감산 효과로 가격 반등, SSD 수요 회복과 동행',
        leadingRating: '중',
        ratingReason: 'NAND 가격은 공급 조절(감산) 영향이 커서 수요 선행성보다는 수급 동행성이 강함',
      },
      {
        id: 'D',
        name: 'Memory Bit Growth - DRAM',
        unit: '%',
        monthly: gen(8, 24, 0.06, 304),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.2 },
        judgment: 'AI 서버 DDR5·HBM 수요 폭증으로 DRAM 비트 성장 가속',
        leadingRating: '상',
        ratingReason: 'DRAM 비트 성장률은 웨이퍼 투입 수요와 직결되는 핵심 선행지표로, 설비투자 판단의 근거',
      },
      {
        id: 'E',
        name: 'Memory Bit Growth - NAND',
        unit: '%',
        monthly: gen(12, 30, 0.05, 305),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 7.8 },
        judgment: 'AI 학습용 SSD 및 데이터센터 확장으로 NAND 비트 성장 확대',
        leadingRating: '중상',
        ratingReason: 'NAND 비트 성장은 웨이퍼 투입에 영향을 주나, 적층수 증가로 웨이퍼 수요 탄력성은 DRAM 대비 낮음',
      },
      {
        id: 'F',
        name: 'Semi. Revenue',
        unit: '$B',
        monthly: gen(38, 58, 0.03, 306),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 15.2 },
        judgment: '반도체 업황 사이클 상승 국면, AI 수요가 성장 핵심 동인',
        leadingRating: '하',
        ratingReason: '반도체 매출은 후행지표로, 이미 실현된 수요를 반영하며 향후 웨이퍼 수요 예측 선행성이 낮음',
      },
    ],
  },
  // ────────────────────────────── Equipment ──────────────────────────────
  {
    id: 'equipment',
    label: 'Equipment',
    indicators: [
      {
        id: 'A',
        name: 'Major Foundry Revenue - TSMC',
        unit: '$B',
        monthly: gen(5.2, 7.8, 0.03, 401),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 12.5 },
        judgment: 'AI 칩 수주 폭증으로 TSMC 매출 사상 최대 행진 지속',
        leadingRating: '중상',
        ratingReason: 'TSMC 매출은 파운드리 가동률의 동행지표이며, 첨단 공정 수주는 향후 웨이퍼 수요 방향성 시사',
      },
      {
        id: 'B',
        name: 'Major Foundry Revenue - UMC',
        unit: '$B',
        monthly: gen(0.58, 0.62, 0.03, 402),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: 0.8 },
        judgment: 'UMC 레거시 공정 매출 보합, 차량용·산업용 수요 안정적',
        leadingRating: '중하',
        ratingReason: 'UMC는 성숙 공정 위주로 전체 웨이퍼 수요 대비 영향도가 제한적, 특수 용도 수요 참고 수준',
      },
      {
        id: 'C',
        name: 'Billings of Equipment - N.America (SB)',
        unit: '$B',
        monthly: gen(2.0, 3.9, 0.05, 403),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 8.2 },
        judgment: '북미 장비 수주 급증, 메모리·파운드리 신규 투자 반영',
        leadingRating: '상',
        ratingReason: '북미 장비 수주(SEMI BB ratio)는 6~12개월 후 Fab 가동과 웨이퍼 투입을 예고하는 핵심 선행지표',
      },
      {
        id: 'D',
        name: 'Billings of Equipment - Japan (VB)',
        unit: '$B',
        monthly: gen(0.85, 1.75, 0.05, 404),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 6.5 },
        judgment: '일본 장비 수주 증가, TSMC 구마모토 등 신규 Fab 투자 효과',
        leadingRating: '중상',
        ratingReason: '일본 장비 수주는 글로벌 Fab 투자의 보조 선행지표로, 특히 일본 내 신규 Fab 확장 시 유의미',
      },
      {
        id: 'E',
        name: 'Mass Flow Controller',
        unit: 'Index',
        monthly: gen(88, 118, 0.03, 405),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.5 },
        judgment: 'MFC 출하 지수 상승, 반도체 장비 가동률 회복 선행 지표',
        leadingRating: '상',
        ratingReason: 'MFC 출하는 장비 가동의 직접적 선행지표로, Fab 투입 6개월 전 신호를 제공',
      },
      {
        id: 'F',
        name: "Korea's Semiconductor Equipment Imports",
        unit: '$B',
        monthly: gen(1.8, 3.4, 0.05, 406),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 9.8 },
        judgment: '국내 반도체 장비 수입 급증, SEC·SKH 대규모 투자 집행 반영',
        leadingRating: '상',
        ratingReason: '한국 장비 수입은 SEC·SKH 투자 집행의 직접 반영으로, 국내 웨이퍼 수요에 높은 선행성',
      },
    ],
  },
  // ────────────────────────────── Wafer ──────────────────────────────
  {
    id: 'wafer',
    label: 'Wafer',
    indicators: [
      {
        id: 'A',
        name: '300mm Shipment (PW)',
        unit: 'Mpcs',
        monthly: gen(5.5, 7.5, 0.025, 501),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 5.8 },
        judgment: 'AI·HBM 수요 견인으로 300mm PW 출하 지속 증가',
        leadingRating: '상',
        ratingReason: '300mm PW는 DRAM/NAND 주력 웨이퍼로, 메모리 투입량과 직결되는 핵심 직접 지표',
      },
      {
        id: 'B',
        name: '300mm Shipment (EPI)',
        unit: 'Mpcs',
        monthly: gen(1.8, 2.7, 0.03, 502),
        semiAnnualEval: { half: 'H2', rating: 'positive', value: 4.2 },
        judgment: '선단 로직 공정 확대로 300mm EPI 출하 꾸준히 증가',
        leadingRating: '상',
        ratingReason: '300mm EPI는 첨단 로직/파운드리 핵심 소재로, AI 칩 생산 확대와 직접 연동',
      },
      {
        id: 'C',
        name: '200mm Shipment (PW)',
        unit: 'Mpcs',
        monthly: gen(3.8, 3.3, 0.02, 503),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: -1.5 },
        judgment: '200mm PW 수요 완만한 감소, 차량용·산업용 일부 지지',
        leadingRating: '중',
        ratingReason: '200mm PW는 성숙 공정용으로 전체 웨이퍼 시장 대비 비중 감소 추세이나 차량용 수요 안정적',
      },
      {
        id: 'D',
        name: '200mm Shipment (EPI)',
        unit: 'Mpcs',
        monthly: gen(1.4, 1.2, 0.025, 504),
        semiAnnualEval: { half: 'H2', rating: 'neutral', value: -0.8 },
        judgment: '200mm EPI 소폭 감소, 레거시 파운드리 수요 안정적',
        leadingRating: '중',
        ratingReason: '200mm EPI는 레거시 파운드리 및 아날로그 반도체용으로 수요 변동성이 낮은 안정 지표',
      },
      {
        id: 'E',
        name: '150mm Shipment (PW)',
        unit: 'Mpcs',
        monthly: gen(1.8, 1.35, 0.02, 505),
        semiAnnualEval: { half: 'H2', rating: 'negative', value: -3.2 },
        judgment: '150mm PW 구조적 감소 추세, 전력반도체 일부 수요 잔존',
        leadingRating: '하',
        ratingReason: '150mm는 구조적 축소 시장으로 전체 웨이퍼 수요 예측에 대한 선행성이 매우 낮음',
      },
      {
        id: 'F',
        name: '150mm Shipment (EPI)',
        unit: 'Mpcs',
        monthly: gen(0.6, 0.42, 0.025, 506),
        semiAnnualEval: { half: 'H2', rating: 'negative', value: -4.1 },
        judgment: '150mm EPI 수요 지속 위축, 소형 디바이스 수요 감소 반영',
        leadingRating: '하',
        ratingReason: '150mm EPI는 시장 퇴출 단계로, 웨이퍼 산업 전반의 방향성 판단에 기여도 미미',
      },
    ],
  },
];

// ── Internal company mock data (36 months) ──────────────────────────────────

function genMetric36(startVal: number, endVal: number, seed: number): { month: string; value: number }[] {
  const values = generateTimeSeries(startVal, endVal, 0.03, seed);
  return DYNAMIC_MONTHS.map((month, i) => ({ month, value: +values[i].toFixed(0) }));
}

export const INTERNAL_COMPANY_DATA: Record<string, InternalCompanyData> = {
  // Memory
  SEC: {
    id: 'SEC',
    name: 'SEC',
    metrics: {
      revenue: genMetric36(8200, 12000, 601),
      waferInput: genMetric36(480, 590, 602),
      utilization: genMetric36(78, 91, 603),
    },
  },
  'SK Hynix': {
    id: 'SK Hynix',
    name: 'SK Hynix',
    metrics: {
      revenue: genMetric36(4200, 6500, 611),
      waferInput: genMetric36(260, 330, 612),
      utilization: genMetric36(76, 90, 613),
    },
  },
  Micron: {
    id: 'Micron',
    name: 'Micron',
    metrics: {
      revenue: genMetric36(3200, 5000, 621),
      waferInput: genMetric36(185, 245, 622),
      utilization: genMetric36(74, 88, 623),
    },
  },
  // Foundry
  TSMC: {
    id: 'TSMC',
    name: 'TSMC',
    metrics: {
      revenue: genMetric36(15500, 23000, 631),
      waferInput: genMetric36(980, 1250, 632),
      utilization: genMetric36(84, 95, 633),
    },
  },
  SMIC: {
    id: 'SMIC',
    name: 'SMIC',
    metrics: {
      revenue: genMetric36(1500, 2200, 641),
      waferInput: genMetric36(120, 155, 642),
      utilization: genMetric36(70, 82, 643),
    },
  },
  GFs: {
    id: 'GFs',
    name: 'GFs',
    metrics: {
      revenue: genMetric36(1050, 1400, 651),
      waferInput: genMetric36(82, 108, 652),
      utilization: genMetric36(68, 80, 653),
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
