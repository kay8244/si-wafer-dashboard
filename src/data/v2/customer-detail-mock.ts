import type { CustomerExecutive, CustomerDetailId, MonthlyMetricData, ConfigurableKpi, NewsCategory } from '@/types/v2';

export const CUSTOMER_LIST: { id: CustomerDetailId; label: string; type: 'memory' | 'foundry' }[] = [
  { id: 'SEC', label: 'SEC (삼성)', type: 'memory' },
  { id: 'SKHynix', label: 'SK하이닉스', type: 'memory' },
  { id: 'Micron', label: 'Micron', type: 'memory' },
  { id: 'SEC_Foundry', label: 'SEC (파운드리)', type: 'foundry' },
  { id: 'TSMC', label: 'TSMC', type: 'foundry' },
  { id: 'SMC', label: 'SMC', type: 'foundry' },
  { id: 'GFS', label: 'GFS', type: 'foundry' },
];

const quarters = ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25(E)'];

function seededValue(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function genWaferInput(base: number) {
  return quarters.map((q, i) => {
    const seed = base * 10 + i;
    return {
      quarter: q,
      km2: +(base * (1 + i * 0.03) + (seededValue(seed) - 0.5) * base * 0.05).toFixed(1),
      km: +(base * 0.8 * (1 + i * 0.025) + (seededValue(seed + 50) - 0.5) * base * 0.04).toFixed(1),
      kpcs: +(base * 120 * (1 + i * 0.02) + (seededValue(seed + 100) - 0.5) * base * 5).toFixed(0),
    };
  });
}

// Generate 12 months of metric data
function genMonthlyMetrics(baseInput: number, basePurchase: number, baseInventory: number, baseUtil: number, baseInvLevel: number): MonthlyMetricData[] {
  const months: MonthlyMetricData[] = [];
  for (let i = 0; i < 12; i++) {
    const monthNum = ((i + 2) % 12) + 1; // Feb 2025 to Jan 2026
    const year = i < 11 ? 25 : 26;
    const month = `${year}.${String(monthNum).padStart(2, '0')}`;
    const seasonFactor = 1 + 0.05 * Math.sin((i / 12) * Math.PI * 2);
    const growthFactor = 1 + i * 0.008;
    months.push({
      month,
      waferInput: +(baseInput * seasonFactor * growthFactor + (seededValue(i * 7 + baseInput) - 0.5) * baseInput * 0.08).toFixed(1),
      purchaseVolume: +(basePurchase * seasonFactor * growthFactor + (seededValue(i * 11 + basePurchase) - 0.5) * basePurchase * 0.1).toFixed(1),
      inventoryMonths: +(baseInventory + (seededValue(i * 13 + baseInventory * 10) - 0.5) * 0.8).toFixed(1),
      utilization: +(baseUtil + (seededValue(i * 17 + baseUtil) - 0.5) * 5 + i * 0.3).toFixed(1),
      inventoryLevel: +(baseInvLevel + (seededValue(i * 19 + baseInvLevel) - 0.5) * 8).toFixed(1),
    });
  }
  return months;
}

function genConfigurableKpis(
  productMixPct: string,
  inventoryLevel: string,
  utilization: string,
  openOrders: string,
  siliconResource: string,
): ConfigurableKpi[] {
  return [
    { id: 'productMix', label: 'Product Mix (DDR5)', value: productMixPct, unit: '%', trend: 'up', trendValue: '+2.1%' },
    { id: 'inventoryLevel', label: '재고수준', value: inventoryLevel, unit: '%', trend: 'down', trendValue: '-3.2%' },
    { id: 'utilization', label: '가동률', value: utilization, unit: '%', trend: 'up', trendValue: '+1.5%' },
    { id: 'openOrders', label: '개방선인 수', value: openOrders, unit: '건', trend: 'flat', trendValue: '0.0%' },
    { id: 'siliconResource', label: 'Silicon 자원', value: siliconResource, unit: '%', trend: 'up', trendValue: '+0.8%' },
    { id: 'waferInput', label: '투입량', value: '45.2', unit: 'Km²', trend: 'up', trendValue: '+3.1%' },
    { id: 'purchaseVolume', label: '구매량', value: '38.5', unit: 'Km²', trend: 'up', trendValue: '+2.4%' },
  ];
}

const NEWS_CATEGORIES: Record<string, NewsCategory[]> = {
  // SEC news
  'SEC_0': ['가동률', '투입/구매량'],
  'SEC_1': ['Product Mix', '투입/구매량'],
  'SEC_2': ['투입량', '재고수준'],
  // SKHynix news
  'SKH_0': ['Product Mix', '투입/구매량'],
  'SKH_1': ['투입량', '재고수준'],
  'SKH_2': ['가동률', '투입/구매량'],
  // Micron news
  'MIC_0': ['Product Mix', '가동률'],
  'MIC_1': ['투입량', '재고수준'],
  // Foundry news
  'SECF_0': ['가동률', 'Product Mix'],
  'SECF_1': ['가동률', '투입/구매량'],
  'TSMC_0': ['투입/구매량', '재고수준'],
  'TSMC_1': ['가동률', 'Product Mix'],
  'SMC_0': ['투입/구매량', '재고수준'],
  'GFS_0': ['투입/구매량', '가동률'],
};

export const CUSTOMER_EXECUTIVES: Record<CustomerDetailId, CustomerExecutive> = {
  SEC: {
    customerId: 'SEC',
    label: 'SEC (삼성전자)',
    type: 'memory',
    newsQueryKo: '삼성전자 반도체 메모리 DRAM',
    newsQueryEn: 'Samsung semiconductor memory DRAM',
    productMix: [
      { category: 'Mobile', percentage: 22, color: '#3B82F6' },
      { category: 'PC', percentage: 29, color: '#10B981' },
      { category: '서버', percentage: 49, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '4.2', unit: '건' },
      { label: 'Silicon 자원', value: '87', unit: '%' },
      { label: '공폐율', value: '2.3', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('49', '78', '91', '4.2', '87'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 25, PC: 32, '서버': 43 } },
      { quarter: 'Q2 24', values: { Mobile: 24, PC: 30, '서버': 46 } },
      { quarter: 'Q3 24', values: { Mobile: 23, PC: 30, '서버': 47 } },
      { quarter: 'Q4 24', values: { Mobile: 22, PC: 29, '서버': 49 } },
    ],
    waferInput: genWaferInput(45),
    monthlyMetrics: genMonthlyMetrics(45, 38, 2.1, 91, 78),
    scrapRate: [
      { label: '내부 공폐', internal: 2.1, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '12.5B GB', bitGrowth: '+8.2%', gap: '3.2%' },
      { source: 'TrendForce', waferBitOut: '12.1B GB', bitGrowth: '+7.8%', gap: '6.5%' },
    ],
    news: [
      { source: 'Gartner', date: '1/6', title: '2025 AI 서버 시장 성장 조정치 발표, SEC 수혜 전망', categories: NEWS_CATEGORIES['SEC_0'] },
      { source: 'Digitimes', date: '1/20', title: 'SEC HBM4 Qual 단일 사이트 대량생산 준비 중', categories: NEWS_CATEGORIES['SEC_1'] },
      { source: 'TrendForce', date: '1/15', title: '삼성전자 1Q25 DRAM 출하 +5% 전망', categories: NEWS_CATEGORIES['SEC_2'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '주요 판단: AI 투자심리 상단 조심 필요. HBM3E Qual 진행률 정상. DDR5 전환 가속 중. 6/7K → 700K 목표 유지.',
    },
  },
  SKHynix: {
    customerId: 'SKHynix',
    label: 'SK하이닉스',
    type: 'memory',
    newsQueryKo: 'SK하이닉스 반도체 HBM DRAM',
    newsQueryEn: 'SK Hynix semiconductor HBM DRAM',
    productMix: [
      { category: 'Mobile', percentage: 18, color: '#3B82F6' },
      { category: 'PC', percentage: 25, color: '#10B981' },
      { category: '서버', percentage: 57, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '3.8', unit: '건' },
      { label: 'Silicon 자원', value: '92', unit: '%' },
      { label: '공폐율', value: '1.8', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('57', '72', '94', '3.8', '92'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 22, PC: 28, '서버': 50 } },
      { quarter: 'Q2 24', values: { Mobile: 20, PC: 27, '서버': 53 } },
      { quarter: 'Q3 24', values: { Mobile: 19, PC: 26, '서버': 55 } },
      { quarter: 'Q4 24', values: { Mobile: 18, PC: 25, '서버': 57 } },
    ],
    waferInput: genWaferInput(52),
    monthlyMetrics: genMonthlyMetrics(52, 44, 1.8, 94, 72),
    scrapRate: [
      { label: '내부 공폐', internal: 1.5, external: 1.4 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '14.2B GB', bitGrowth: '+12.5%', gap: '2.1%' },
      { source: 'TrendForce', waferBitOut: '13.8B GB', bitGrowth: '+11.8%', gap: '5.0%' },
    ],
    news: [
      { source: 'Digitimes', date: '1/20', title: 'SK하이닉스 HBM4 Qual 4분기 완료 전망', categories: NEWS_CATEGORIES['SKH_0'] },
      { source: 'TrendForce', date: '1/15', title: 'SK하이닉스 1Q25 HBM 출하 +15% 전망', categories: NEWS_CATEGORIES['SKH_1'] },
      { source: 'Reuters', date: '1/22', title: 'SK하이닉스 M15X 신공장 착공, 2026년 양산 목표', categories: NEWS_CATEGORIES['SKH_2'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: 'HBM3E 수율 업계 최고 수준 유지. AI 서버향 수요 강세. M15X 진행 정상. Wafer 공급 안정적.',
    },
  },
  Micron: {
    customerId: 'Micron',
    label: 'Micron',
    type: 'memory',
    newsQueryKo: '마이크론 반도체 메모리',
    newsQueryEn: 'Micron semiconductor memory',
    productMix: [
      { category: 'Mobile', percentage: 28, color: '#3B82F6' },
      { category: 'PC', percentage: 32, color: '#10B981' },
      { category: '서버', percentage: 40, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '3.5', unit: '건' },
      { label: 'Silicon 자원', value: '85', unit: '%' },
      { label: '공폐율', value: '2.8', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('40', '82', '88', '3.5', '85'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 30, PC: 35, '서버': 35 } },
      { quarter: 'Q2 24', values: { Mobile: 29, PC: 34, '서버': 37 } },
      { quarter: 'Q3 24', values: { Mobile: 29, PC: 33, '서버': 38 } },
      { quarter: 'Q4 24', values: { Mobile: 28, PC: 32, '서버': 40 } },
    ],
    waferInput: genWaferInput(38),
    monthlyMetrics: genMonthlyMetrics(38, 32, 2.5, 88, 82),
    scrapRate: [
      { label: '내부 공폐', internal: 2.5, external: 2.0 },
      { label: '기관 공폐', internal: 0.4, external: 0.6 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '9.8B GB', bitGrowth: '+6.5%', gap: '4.8%' },
      { source: 'TrendForce', waferBitOut: '9.5B GB', bitGrowth: '+5.9%', gap: '7.9%' },
    ],
    news: [
      { source: 'Bloomberg', date: '1/18', title: 'Micron HBM3E 수율 개선, NVIDIA 향 납품 확대', categories: NEWS_CATEGORIES['MIC_0'] },
      { source: 'TrendForce', date: '1/12', title: 'Micron 1Q25 DRAM 출하 +3% 전망, 보수적 가이던스', categories: NEWS_CATEGORIES['MIC_1'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: 'HBM3E 납품 안정화. Fab 가동률 상승 중. DDR5 전환율 업계 평균 수준.',
    },
  },
  SEC_Foundry: {
    customerId: 'SEC_Foundry',
    label: 'SEC (파운드리)',
    type: 'foundry',
    newsQueryKo: '삼성 파운드리 반도체',
    newsQueryEn: 'Samsung Foundry semiconductor',
    productMix: [
      { category: 'Mobile', percentage: 35, color: '#3B82F6' },
      { category: 'PC', percentage: 25, color: '#10B981' },
      { category: '서버', percentage: 40, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '72', unit: '%' },
      { label: '수율', value: '68', unit: '%' },
      { label: '공폐율', value: '3.2', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('40', '65', '72', '2.1', '78'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 38, PC: 27, '서버': 35 } },
      { quarter: 'Q2 24', values: { Mobile: 37, PC: 26, '서버': 37 } },
      { quarter: 'Q3 24', values: { Mobile: 36, PC: 26, '서버': 38 } },
      { quarter: 'Q4 24', values: { Mobile: 35, PC: 25, '서버': 40 } },
    ],
    waferInput: genWaferInput(28),
    monthlyMetrics: genMonthlyMetrics(28, 24, 1.5, 72, 65),
    scrapRate: [
      { label: '내부 공폐', internal: 2.8, external: 2.2 },
      { label: '기관 공폐', internal: 0.5, external: 0.7 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/15', title: '삼성 파운드리 2nm GAA 공정 개발 가속', categories: NEWS_CATEGORIES['SECF_0'] },
      { source: 'TheElec', date: '1/20', title: '삼성 파운드리 가동률 회복 중, 1Q25 +5%p 전망', categories: NEWS_CATEGORIES['SECF_1'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '3nm 수율 개선 중. 2nm GAA 개발 일정 정상. 가동률 회복세 지속.',
    },
    foundryData: '2nm GAA: 2025H2 리스크 생산 목표',
    mktInfo: 'Foundry 시장 2025 +12% 성장 전망 (TrendForce)',
  },
  TSMC: {
    customerId: 'TSMC',
    label: 'TSMC',
    type: 'foundry',
    newsQueryKo: 'TSMC 파운드리 반도체',
    newsQueryEn: 'TSMC foundry semiconductor',
    productMix: [
      { category: 'Mobile', percentage: 45, color: '#3B82F6' },
      { category: 'PC', percentage: 20, color: '#10B981' },
      { category: '서버', percentage: 35, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '95', unit: '%' },
      { label: '수율', value: '92', unit: '%' },
      { label: '공폐율', value: '1.2', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('35', '85', '95', '5.1', '94'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 48, PC: 22, '서버': 30 } },
      { quarter: 'Q2 24', values: { Mobile: 47, PC: 21, '서버': 32 } },
      { quarter: 'Q3 24', values: { Mobile: 46, PC: 21, '서버': 33 } },
      { quarter: 'Q4 24', values: { Mobile: 45, PC: 20, '서버': 35 } },
    ],
    waferInput: genWaferInput(85),
    monthlyMetrics: genMonthlyMetrics(85, 72, 1.2, 95, 85),
    scrapRate: [
      { label: '내부 공폐', internal: 1.0, external: 0.8 },
      { label: '기관 공폐', internal: 0.1, external: 0.3 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/22', title: 'TSMC 4Q24 매출 $26.3B, 사상 최고 기록', categories: NEWS_CATEGORIES['TSMC_0'] },
      { source: 'Digitimes', date: '1/18', title: 'TSMC A16 공정 2026 양산 예정, AI칩 수요 대응', categories: NEWS_CATEGORIES['TSMC_1'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '업계 최고 가동률 유지. AI칩 수요로 3nm/5nm 풀가동. CoWoS 캐파 지속 확장.',
    },
    foundryData: 'A16: 2026 양산, N2: 양산 중',
    mktInfo: 'Foundry 시장 점유율 62% (TrendForce)',
  },
  SMC: {
    customerId: 'SMC',
    label: 'SMC',
    type: 'foundry',
    newsQueryKo: 'SMIC 파운드리 반도체',
    newsQueryEn: 'SMIC foundry semiconductor',
    productMix: [
      { category: 'Mobile', percentage: 40, color: '#3B82F6' },
      { category: 'PC', percentage: 30, color: '#10B981' },
      { category: '서버', percentage: 30, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '78', unit: '%' },
      { label: '수율', value: '85', unit: '%' },
      { label: '공폐율', value: '2.5', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('30', '70', '78', '1.8', '82'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 42, PC: 32, '서버': 26 } },
      { quarter: 'Q2 24', values: { Mobile: 41, PC: 31, '서버': 28 } },
      { quarter: 'Q3 24', values: { Mobile: 41, PC: 31, '서버': 28 } },
      { quarter: 'Q4 24', values: { Mobile: 40, PC: 30, '서버': 30 } },
    ],
    waferInput: genWaferInput(22),
    monthlyMetrics: genMonthlyMetrics(22, 18, 2.0, 78, 70),
    scrapRate: [
      { label: '내부 공폐', internal: 2.2, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/10', title: 'SMC 28nm 수요 회복세, 자동차/IoT 수요 증가', categories: NEWS_CATEGORIES['SMC_0'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '성숙 공정 수요 회복. 28nm 자동차향 수주 증가. 14nm 전환 순조.',
    },
    foundryData: '14nm FinFET 양산 안정화',
    mktInfo: 'Foundry 시장 점유율 6% (TrendForce)',
  },
  GFS: {
    customerId: 'GFS',
    label: 'GFS (GlobalFoundries)',
    type: 'foundry',
    newsQueryKo: 'GlobalFoundries 파운드리',
    newsQueryEn: 'GlobalFoundries foundry semiconductor',
    productMix: [
      { category: 'Mobile', percentage: 30, color: '#3B82F6' },
      { category: 'PC', percentage: 35, color: '#10B981' },
      { category: '서버', percentage: 35, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '82', unit: '%' },
      { label: '수율', value: '88', unit: '%' },
      { label: '공폐율', value: '2.0', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('35', '75', '82', '2.3', '85'),
    productMixTrend: [
      { quarter: 'Q1 24', values: { Mobile: 32, PC: 36, '서버': 32 } },
      { quarter: 'Q2 24', values: { Mobile: 31, PC: 36, '서버': 33 } },
      { quarter: 'Q3 24', values: { Mobile: 31, PC: 35, '서버': 34 } },
      { quarter: 'Q4 24', values: { Mobile: 30, PC: 35, '서버': 35 } },
    ],
    waferInput: genWaferInput(18),
    monthlyMetrics: genMonthlyMetrics(18, 15, 1.8, 82, 75),
    scrapRate: [
      { label: '내부 공폐', internal: 1.8, external: 1.5 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/14', title: 'GlobalFoundries 자동차/산업용 반도체 수주 확대', categories: NEWS_CATEGORIES['GFS_0'] },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '특화 공정(RF-SOI, SiGe) 수요 안정. 자동차향 성장 지속.',
    },
    foundryData: 'RF-SOI, SiGe BiCMOS 특화',
    mktInfo: 'Foundry 시장 점유율 5% (TrendForce)',
  },
};
