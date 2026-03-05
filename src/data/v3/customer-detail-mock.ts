import type { CustomerExecutive, CustomerDetailId, MonthlyMetricData, ConfigurableKpi, NewsCategory, AggregateCustomerId, WaferInOutQuarterlyEntry, BitGrowthQuarterlyEntry } from '@/types/v3';

export const CUSTOMER_LIST: { id: CustomerDetailId; label: string; type: 'memory' | 'foundry' | 'aggregate'; subLabel?: string }[] = [
  { id: 'Total_DRAM_NAND', label: 'Total DRAM/NAND', type: 'aggregate' },
  { id: 'Total_Foundry', label: 'Total Foundry', type: 'aggregate' },
  { id: 'SEC', label: 'SEC', type: 'memory', subLabel: 'Prime(메모리)' },
  { id: 'SEC_Foundry', label: 'SEC', type: 'foundry', subLabel: 'EPI(파운드리)' },
  { id: 'SKHynix', label: 'SKHY', type: 'memory', subLabel: 'Prime(메모리)' },
  { id: 'Micron', label: 'Micron', type: 'memory', subLabel: 'Prime(메모리)' },
  { id: 'Koxia', label: 'Koxia', type: 'memory', subLabel: 'Prime(메모리)' },
  { id: 'TSMC', label: 'TSMC', type: 'foundry', subLabel: 'EPI(파운드리)' },
  { id: 'SMC', label: 'SMIC', type: 'foundry', subLabel: 'EPI(파운드리)' },
  { id: 'GFS', label: 'GFs', type: 'foundry', subLabel: 'EPI(파운드리)' },
  { id: 'STM', label: 'STM', type: 'foundry', subLabel: 'EPI(파운드리)' },
  { id: 'Intel', label: 'Intel', type: 'foundry', subLabel: 'EPI(파운드리)' },
];

const quarters = ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26(E)'];

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

// Generate 36 months of metric data (supports 4Q/8Q/12Q time ranges)
function genMonthlyMetrics(baseInput: number, basePurchase: number, baseInventory: number, baseUtil: number, baseInvLevel: number): MonthlyMetricData[] {
  const months: MonthlyMetricData[] = [];
  const MONTH_COUNT = 51; // March 2023 to May 2027 (~4 years, covers current + 1 year ahead)
  for (let i = 0; i < MONTH_COUNT; i++) {
    const totalMonth = 3 + i; // Start from March 2023
    const year = 23 + Math.floor((totalMonth - 1) / 12);
    const monthNum = ((totalMonth - 1) % 12) + 1;
    const month = `${year}.${String(monthNum).padStart(2, '0')}`;
    const seasonFactor = 1 + 0.05 * Math.sin((i / 12) * Math.PI * 2);
    const growthFactor = 1 + i * 0.003;
    const waferInput = +(baseInput * seasonFactor * growthFactor + (seededValue(i * 7 + baseInput) - 0.5) * baseInput * 0.08).toFixed(1);
    const baseCapa = baseInput * 1.15;
    months.push({
      month,
      waferInput,
      purchaseVolume: +(basePurchase * seasonFactor * growthFactor + (seededValue(i * 11 + basePurchase) - 0.5) * basePurchase * 0.1).toFixed(1),
      inventoryMonths: +(baseInventory + (seededValue(i * 13 + baseInventory * 10) - 0.5) * 0.8).toFixed(1),
      utilization: +(baseUtil + (seededValue(i * 17 + baseUtil) - 0.5) * 5 + i * 0.1).toFixed(1),
      inventoryLevel: +(baseInvLevel + (seededValue(i * 19 + baseInvLevel) - 0.5) * 8).toFixed(1),
      capa: +(baseCapa * (1 + i * 0.002) + (seededValue(i * 23 + baseCapa) - 0.5) * baseCapa * 0.03).toFixed(1),
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
    { id: 'inventoryLevel', label: '재고수준', value: inventoryLevel, unit: '개월', trend: 'down', trendValue: '-3.2%' },
    { id: 'utilization', label: '가동률', value: utilization, unit: '%', trend: 'up', trendValue: '+1.5%' },
    { id: 'openOrders', label: '개방선인 수', value: openOrders, unit: '건', trend: 'flat', trendValue: '0.0%' },
    { id: 'siliconResource', label: 'Silicon 자원', value: siliconResource, unit: '%', trend: 'up', trendValue: '+0.8%' },
    { id: 'waferInput', label: '투입량', value: '45.2', unit: 'Km²', trend: 'up', trendValue: '+3.1%' },
    { id: 'purchaseVolume', label: '구매량', value: '38.5', unit: 'Km²', trend: 'up', trendValue: '+2.4%' },
  ];
}

function genWaferInOutQuarterly(baseIn: number, baseOut: number): WaferInOutQuarterlyEntry[] {
  const qs = ["Q1'23","Q2'23","Q3'23","Q4'23","Q1'24","Q2'24","Q3'24","Q4'24","Q1'25","Q2'25","Q3'25","Q4'25","Q1'26(E)","Q2'26(E)","Q3'26(E)","Q4'26(E)","Q1'27(E)","Q2'27(E)"];
  return qs.map((q, i) => {
    const growth = 1 + i * 0.018;
    const seasonal = 1 + 0.1 * Math.sin((i / 4) * Math.PI * 2);
    return {
      quarter: q,
      waferIn: +(baseIn * growth * seasonal + (seededValue(i * 7 + baseIn) - 0.5) * baseIn * 0.12).toFixed(0),
      waferOut: +(baseOut * growth * seasonal + (seededValue(i * 11 + baseOut) - 0.5) * baseOut * 0.1).toFixed(0),
      isEstimate: q.includes('(E)'),
    };
  });
}

function genBitGrowthQuarterly(baseGrowth: number): BitGrowthQuarterlyEntry[] {
  const qs = ["Q1'23","Q2'23","Q3'23","Q4'23","Q1'24","Q2'24","Q3'24","Q4'24","Q1'25","Q2'25","Q3'25","Q4'25","Q1'26(E)","Q2'26(E)","Q3'26(E)","Q4'26(E)","Q1'27(E)","Q2'27(E)"];
  return qs.map((q, i) => ({
    quarter: q,
    growth: +(baseGrowth + (seededValue(i * 13 + baseGrowth * 10) - 0.5) * 8 + i * 0.5).toFixed(1),
    isEstimate: q.includes('(E)'),
  }));
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
      { quarter: 'Q1 25', values: { Mobile: 25, PC: 32, '서버': 43 } },
      { quarter: 'Q2 25', values: { Mobile: 24, PC: 30, '서버': 46 } },
      { quarter: 'Q3 25', values: { Mobile: 23, PC: 30, '서버': 47 } },
      { quarter: 'Q4 25', values: { Mobile: 22, PC: 29, '서버': 49 } },
    ],
    waferInput: genWaferInput(45),
    monthlyMetrics: genMonthlyMetrics(45, 38, 2.1, 91, 78),
    waferInOutQuarterly: genWaferInOutQuarterly(45, 43),
    bitGrowthQuarterly: genBitGrowthQuarterly(8.2),
    scrapRate: [
      { label: '내부 공폐', internal: 2.1, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '12.5B GB', bitGrowth: '+8.2%', gap: '3.2%' },
      { source: 'TrendForce', waferBitOut: '12.1B GB', bitGrowth: '+7.8%', gap: '6.5%' },
    ],
    news: [
      { source: 'Gartner', date: '1/6', title: '2025 AI 서버 시장 성장 조정치 발표, SEC 수혜 전망', categories: NEWS_CATEGORIES['SEC_0'] },
      { source: 'Digitimes', date: '1/20', title: 'SEC HBM4 Qual 단일 사이트 대량생산 준비 중', categories: NEWS_CATEGORIES['SEC_1'] },
      { source: 'TrendForce', date: '1/15', title: '삼성전자 1Q25 DRAM 출하 +5% 전망', categories: NEWS_CATEGORIES['SEC_2'] },
      { source: 'TheElec', date: '1/8', title: 'SEC DDR5 전환율 45% 돌파, 서버향 비중 확대' },
      { source: 'Bloomberg', date: '1/12', title: 'Samsung NAND 9세대 V-NAND 수율 안정화 진입' },
      { source: 'Reuters', date: '1/18', title: 'SEC 평택 P4 증설 본격화, 2026 완공 목표' },
      { source: 'Omdia', date: '1/22', title: 'Samsung HBM3E 12H 양산 시작, NVIDIA 납품 확대' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
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
      { quarter: 'Q1 25', values: { Mobile: 22, PC: 28, '서버': 50 } },
      { quarter: 'Q2 25', values: { Mobile: 20, PC: 27, '서버': 53 } },
      { quarter: 'Q3 25', values: { Mobile: 19, PC: 26, '서버': 55 } },
      { quarter: 'Q4 25', values: { Mobile: 18, PC: 25, '서버': 57 } },
    ],
    waferInput: genWaferInput(52),
    monthlyMetrics: genMonthlyMetrics(52, 44, 1.8, 94, 72),
    waferInOutQuarterly: genWaferInOutQuarterly(52, 50),
    bitGrowthQuarterly: genBitGrowthQuarterly(12.5),
    scrapRate: [
      { label: '내부 공폐', internal: 1.5, external: 1.4 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '14.2B GB', bitGrowth: '+12.5%', gap: '2.1%' },
      { source: 'TrendForce', waferBitOut: '13.8B GB', bitGrowth: '+11.8%', gap: '5.0%' },
    ],
    news: [
      { source: 'Digitimes', date: '1/20', title: 'SK하이닉스 HBM4 Qual 4분기 완료 전망', categories: NEWS_CATEGORIES['SKH_0'] },
      { source: 'TrendForce', date: '1/15', title: 'SK하이닉스 1Q25 HBM 출하 +15% 전망', categories: NEWS_CATEGORIES['SKH_1'] },
      { source: 'Reuters', date: '1/22', title: 'SK하이닉스 M15X 신공장 착공, 2026년 양산 목표', categories: NEWS_CATEGORIES['SKH_2'] },
      { source: 'Bloomberg', date: '1/10', title: 'SK하이닉스 HBM3E 12H 수율 업계 최고 수준 유지' },
      { source: 'TheElec', date: '1/18', title: 'SKHP DDR5 서버향 비중 60% 돌파, 가격 안정세' },
      { source: 'Omdia', date: '1/25', title: 'SK하이닉스 NAND 238단 양산 비중 확대 중' },
      { source: 'Gartner', date: '1/8', title: 'SK하이닉스 AI 메모리 시장 점유율 50% 전망' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
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
      { quarter: 'Q1 25', values: { Mobile: 30, PC: 35, '서버': 35 } },
      { quarter: 'Q2 25', values: { Mobile: 29, PC: 34, '서버': 37 } },
      { quarter: 'Q3 25', values: { Mobile: 29, PC: 33, '서버': 38 } },
      { quarter: 'Q4 25', values: { Mobile: 28, PC: 32, '서버': 40 } },
    ],
    waferInput: genWaferInput(38),
    monthlyMetrics: genMonthlyMetrics(38, 32, 2.5, 88, 82),
    waferInOutQuarterly: genWaferInOutQuarterly(38, 36),
    bitGrowthQuarterly: genBitGrowthQuarterly(6.5),
    scrapRate: [
      { label: '내부 공폐', internal: 2.5, external: 2.0 },
      { label: '기관 공폐', internal: 0.4, external: 0.6 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '9.8B GB', bitGrowth: '+6.5%', gap: '4.8%' },
      { source: 'TrendForce', waferBitOut: '9.5B GB', bitGrowth: '+5.9%', gap: '7.9%' },
    ],
    news: [
      { source: 'Bloomberg', date: '1/18', title: 'Micron HBM3E 수율 개선, NVIDIA 향 납품 확대', categories: NEWS_CATEGORIES['MIC_0'] },
      { source: 'TrendForce', date: '1/12', title: 'Micron 1Q25 DRAM 출하 +3% 전망, 보수적 가이던스', categories: NEWS_CATEGORIES['MIC_1'] },
      { source: 'Reuters', date: '1/20', title: 'Micron 아이다호 신규 팹 착공, CHIPS Act 보조금 활용' },
      { source: 'Digitimes', date: '1/8', title: 'Micron DDR5 전환 가속, 1b DRAM 양산 비중 30% 돌파' },
      { source: 'Omdia', date: '1/15', title: 'Micron NAND 232단 서버 SSD 수주 확대, 기업향 매출 성장' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
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
      { quarter: 'Q1 25', values: { Mobile: 38, PC: 27, '서버': 35 } },
      { quarter: 'Q2 25', values: { Mobile: 37, PC: 26, '서버': 37 } },
      { quarter: 'Q3 25', values: { Mobile: 36, PC: 26, '서버': 38 } },
      { quarter: 'Q4 25', values: { Mobile: 35, PC: 25, '서버': 40 } },
    ],
    waferInput: genWaferInput(28),
    monthlyMetrics: genMonthlyMetrics(28, 24, 1.5, 72, 65),
    waferInOutQuarterly: genWaferInOutQuarterly(28, 26),
    bitGrowthQuarterly: genBitGrowthQuarterly(3.5),
    scrapRate: [
      { label: '내부 공폐', internal: 2.8, external: 2.2 },
      { label: '기관 공폐', internal: 0.5, external: 0.7 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/15', title: '삼성 파운드리 2nm GAA 공정 개발 가속', categories: NEWS_CATEGORIES['SECF_0'] },
      { source: 'TheElec', date: '1/20', title: '삼성 파운드리 가동률 회복 중, 1Q25 +5%p 전망', categories: NEWS_CATEGORIES['SECF_1'] },
      { source: 'Bloomberg', date: '1/10', title: 'Samsung Foundry 3nm 수율 70% 돌파, 고객사 확대 기대' },
      { source: 'Reuters', date: '1/18', title: 'SEC 파운드리 Qualcomm 차세대 AP 수주 확보 전망' },
      { source: 'TrendForce', date: '1/22', title: '삼성 파운드리 가동률 70%대 회복, 4nm 주력 비중 확대' },
      { source: 'Omdia', date: '1/25', title: '삼성 파운드리 2025 매출 전년비 +15% 성장 전망' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
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
      { quarter: 'Q1 25', values: { Mobile: 48, PC: 22, '서버': 30 } },
      { quarter: 'Q2 25', values: { Mobile: 47, PC: 21, '서버': 32 } },
      { quarter: 'Q3 25', values: { Mobile: 46, PC: 21, '서버': 33 } },
      { quarter: 'Q4 25', values: { Mobile: 45, PC: 20, '서버': 35 } },
    ],
    waferInput: genWaferInput(85),
    monthlyMetrics: genMonthlyMetrics(85, 72, 1.2, 95, 85),
    waferInOutQuarterly: genWaferInOutQuarterly(85, 82),
    bitGrowthQuarterly: genBitGrowthQuarterly(5.0),
    scrapRate: [
      { label: '내부 공폐', internal: 1.0, external: 0.8 },
      { label: '기관 공폐', internal: 0.1, external: 0.3 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/22', title: 'TSMC 4Q24 매출 $26.3B, 사상 최고 기록', categories: NEWS_CATEGORIES['TSMC_0'] },
      { source: 'Digitimes', date: '1/18', title: 'TSMC A16 공정 2026 양산 예정, AI칩 수요 대응', categories: NEWS_CATEGORIES['TSMC_1'] },
      { source: 'Bloomberg', date: '1/10', title: 'TSMC CoWoS 캐파 2025년 2배 확대, AI칩 병목 해소' },
      { source: 'TrendForce', date: '1/14', title: 'TSMC N3E 수율 80% 이상, Apple·NVIDIA·AMD 수주 확대' },
      { source: 'Omdia', date: '1/20', title: 'TSMC 2025 CapEx $38B 전망, 업계 최대 투자' },
      { source: 'TheElec', date: '1/25', title: 'TSMC 일본 구마모토 2공장 건설 순조, 2027 가동 목표' },
      { source: 'Gartner', date: '1/8', title: 'TSMC AI 반도체 매출 비중 2025년 30% 돌파 전망' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: '업계 최고 가동률 유지. AI칩 수요로 3nm/5nm 풀가동. CoWoS 캐파 지속 확장.',
    },
    foundryData: 'A16: 2026 양산, N2: 양산 중',
    mktInfo: 'Foundry 시장 점유율 62% (TrendForce)',
  },
  SMC: {
    customerId: 'SMC',
    label: 'SMIC',
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
      { quarter: 'Q1 25', values: { Mobile: 42, PC: 32, '서버': 26 } },
      { quarter: 'Q2 25', values: { Mobile: 41, PC: 31, '서버': 28 } },
      { quarter: 'Q3 25', values: { Mobile: 41, PC: 31, '서버': 28 } },
      { quarter: 'Q4 25', values: { Mobile: 40, PC: 30, '서버': 30 } },
    ],
    waferInput: genWaferInput(22),
    monthlyMetrics: genMonthlyMetrics(22, 18, 2.0, 78, 70),
    waferInOutQuarterly: genWaferInOutQuarterly(22, 20),
    bitGrowthQuarterly: genBitGrowthQuarterly(4.0),
    scrapRate: [
      { label: '내부 공폐', internal: 2.2, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/10', title: 'SMC 28nm 수요 회복세, 자동차/IoT 수요 증가', categories: NEWS_CATEGORIES['SMC_0'] },
      { source: 'Reuters', date: '1/15', title: 'SMIC 14nm 전환 비중 확대, 중국 내수 수요 견인' },
      { source: 'Bloomberg', date: '1/20', title: 'SMIC 2025 CapEx 전년 수준 유지, 성숙 공정 집중' },
      { source: 'TrendForce', date: '1/18', title: 'SMIC 가동률 78%로 회복세, 전장향 수주 증가' },
      { source: 'Omdia', date: '1/22', title: 'SMIC 중국 반도체 자급률 확대의 핵심 수혜 기업' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
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
      { quarter: 'Q1 25', values: { Mobile: 32, PC: 36, '서버': 32 } },
      { quarter: 'Q2 25', values: { Mobile: 31, PC: 36, '서버': 33 } },
      { quarter: 'Q3 25', values: { Mobile: 31, PC: 35, '서버': 34 } },
      { quarter: 'Q4 25', values: { Mobile: 30, PC: 35, '서버': 35 } },
    ],
    waferInput: genWaferInput(18),
    monthlyMetrics: genMonthlyMetrics(18, 15, 1.8, 82, 75),
    waferInOutQuarterly: genWaferInOutQuarterly(18, 17),
    bitGrowthQuarterly: genBitGrowthQuarterly(3.0),
    scrapRate: [
      { label: '내부 공폐', internal: 1.8, external: 1.5 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/14', title: 'GlobalFoundries 자동차/산업용 반도체 수주 확대', categories: NEWS_CATEGORIES['GFS_0'] },
      { source: 'Bloomberg', date: '1/18', title: 'GFs RF-SOI 공정 5G 통신칩 수요 급증' },
      { source: 'Digitimes', date: '1/10', title: 'GlobalFoundries 미국 팹 확장, CHIPS Act 보조금 확정' },
      { source: 'TrendForce', date: '1/22', title: 'GFs 22FDX 공정 자동차향 수주 다변화 성공' },
      { source: 'Omdia', date: '1/20', title: 'GlobalFoundries 특화 공정 시장 점유율 안정적 유지' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: '특화 공정(RF-SOI, SiGe) 수요 안정. 자동차향 성장 지속.',
    },
    foundryData: 'RF-SOI, SiGe BiCMOS 특화',
    mktInfo: 'Foundry 시장 점유율 5% (TrendForce)',
  },
  Total_DRAM_NAND: {
    customerId: 'Total_DRAM_NAND',
    label: 'Total DRAM/NAND',
    type: 'memory',
    productMix: [
      { category: 'DRAM', percentage: 55, color: '#3B82F6' },
      { category: 'NAND', percentage: 35, color: '#10B981' },
      { category: 'Other', percentage: 10, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '총 투입량', value: '135', unit: 'Km²' },
      { label: '평균 가동률', value: '89', unit: '%' },
      { label: '평균 공폐율', value: '2.1', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('55', '76', '89', '11.5', '88'),
    productMixTrend: [
      { quarter: 'Q1 25', values: { DRAM: 53, NAND: 37, Other: 10 } },
      { quarter: 'Q2 25', values: { DRAM: 54, NAND: 36, Other: 10 } },
      { quarter: 'Q3 25', values: { DRAM: 54, NAND: 36, Other: 10 } },
      { quarter: 'Q4 25', values: { DRAM: 55, NAND: 35, Other: 10 } },
    ],
    waferInput: genWaferInput(135),
    monthlyMetrics: genMonthlyMetrics(135, 114, 2.0, 89, 76),
    waferInOutQuarterly: genWaferInOutQuarterly(135, 130),
    bitGrowthQuarterly: genBitGrowthQuarterly(9.1),
    scrapRate: [
      { label: '내부 공폐', internal: 2.0, external: 1.7 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '36.5B GB', bitGrowth: '+9.1%', gap: '3.5%' },
      { source: 'TrendForce', waferBitOut: '35.4B GB', bitGrowth: '+8.5%', gap: '6.6%' },
    ],
    news: [
      { source: 'TrendForce', date: '1/20', title: '2025 글로벌 DRAM/NAND 시장 +12% 성장 전망' },
      { source: 'Omdia', date: '1/18', title: '메모리 반도체 수요 AI 서버향 중심 회복세' },
      { source: 'Gartner', date: '1/10', title: '2025 반도체 시장 $700B 전망, 메모리 성장 주도' },
      { source: 'Bloomberg', date: '1/15', title: '글로벌 DRAM ASP 상승세 지속, DDR5 프리미엄 확대' },
      { source: 'Reuters', date: '1/22', title: '메모리 업계 CapEx 확대 사이클 진입, 공급 증가 예상' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: '전체 DRAM/NAND 시장 AI 서버 중심 회복. DDR5 전환 가속. HBM 수요 강세 지속.',
    },
  },
  Koxia: {
    customerId: 'Koxia',
    label: 'Koxia (키옥시아)',
    type: 'memory',
    newsQueryKo: '키옥시아 반도체 NAND',
    newsQueryEn: 'Kioxia semiconductor NAND',
    productMix: [
      { category: 'Mobile', percentage: 20, color: '#3B82F6' },
      { category: 'PC', percentage: 35, color: '#10B981' },
      { category: '서버', percentage: 45, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '2.8', unit: '건' },
      { label: 'Silicon 자원', value: '82', unit: '%' },
      { label: '공폐율', value: '2.5', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('45', '80', '85', '2.8', '82'),
    productMixTrend: [
      { quarter: 'Q1 25', values: { Mobile: 22, PC: 38, '서버': 40 } },
      { quarter: 'Q2 25', values: { Mobile: 21, PC: 37, '서버': 42 } },
      { quarter: 'Q3 25', values: { Mobile: 21, PC: 36, '서버': 43 } },
      { quarter: 'Q4 25', values: { Mobile: 20, PC: 35, '서버': 45 } },
    ],
    waferInput: genWaferInput(32),
    monthlyMetrics: genMonthlyMetrics(32, 27, 2.2, 85, 80),
    waferInOutQuarterly: genWaferInOutQuarterly(32, 30),
    bitGrowthQuarterly: genBitGrowthQuarterly(5.8),
    scrapRate: [
      { label: '내부 공폐', internal: 2.2, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '8.2B GB', bitGrowth: '+5.8%', gap: '4.2%' },
      { source: 'TrendForce', waferBitOut: '7.9B GB', bitGrowth: '+5.2%', gap: '7.1%' },
    ],
    news: [
      { source: 'Digitimes', date: '1/16', title: 'Kioxia NAND 232단 양산 확대, 서버 SSD 수요 대응' },
      { source: 'Bloomberg', date: '1/10', title: 'Kioxia IPO 성공적 완료, 시가총액 $10B 돌파' },
      { source: 'TrendForce', date: '1/20', title: 'Kioxia NAND 시장 점유율 3위 유지, 서버 SSD 집중' },
      { source: 'Reuters', date: '1/18', title: 'Kioxia WD 합병 협상 재개, 2025 내 결론 전망' },
      { source: 'Omdia', date: '1/22', title: 'Kioxia 3D NAND 경쟁력 유지, 원가 절감 효과 확대' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: 'NAND 232단 양산 안정화. 서버 SSD 수요 증가. IPO 후 투자 확대 기대.',
    },
  },
  STM: {
    customerId: 'STM',
    label: 'STM (STMicroelectronics)',
    type: 'foundry',
    newsQueryKo: 'STMicroelectronics 반도체',
    newsQueryEn: 'STMicroelectronics semiconductor',
    productMix: [
      { category: 'Automotive', percentage: 50, color: '#3B82F6' },
      { category: 'Industrial', percentage: 30, color: '#10B981' },
      { category: 'Others', percentage: 20, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '76', unit: '%' },
      { label: '수율', value: '90', unit: '%' },
      { label: '공폐율', value: '1.8', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('20', '72', '76', '1.5', '80'),
    productMixTrend: [
      { quarter: 'Q1 25', values: { Automotive: 48, Industrial: 32, Others: 20 } },
      { quarter: 'Q2 25', values: { Automotive: 49, Industrial: 31, Others: 20 } },
      { quarter: 'Q3 25', values: { Automotive: 49, Industrial: 31, Others: 20 } },
      { quarter: 'Q4 25', values: { Automotive: 50, Industrial: 30, Others: 20 } },
    ],
    waferInput: genWaferInput(15),
    monthlyMetrics: genMonthlyMetrics(15, 12, 1.6, 76, 72),
    waferInOutQuarterly: genWaferInOutQuarterly(15, 14),
    bitGrowthQuarterly: genBitGrowthQuarterly(2.5),
    scrapRate: [
      { label: '내부 공폐', internal: 1.6, external: 1.3 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/12', title: 'STM 자동차 반도체 SiC 전력소자 투자 확대' },
      { source: 'Bloomberg', date: '1/15', title: 'STM 300mm 팹 전환 가속, 원가 경쟁력 강화' },
      { source: 'Digitimes', date: '1/20', title: 'STM 자동차향 매출 비중 50% 돌파, EV 수혜 지속' },
      { source: 'TrendForce', date: '1/18', title: 'STM SiC MOSFET 시장 점유율 확대, Tesla 공급 안정' },
      { source: 'Omdia', date: '1/22', title: 'STM 산업용 MCU 수주 회복, 2H25 성장 기대' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: 'SiC 전력소자 수요 강세. 자동차향 매출 비중 확대. 300mm 팹 전환 진행 중.',
    },
    foundryData: 'SiC MOSFET 양산, 300mm 전환 중',
    mktInfo: '자동차 반도체 글로벌 Top 3',
  },
  Intel: {
    customerId: 'Intel',
    label: 'Intel (Foundry)',
    type: 'foundry',
    newsQueryKo: '인텔 파운드리 반도체',
    newsQueryEn: 'Intel foundry semiconductor',
    productMix: [
      { category: 'PC', percentage: 40, color: '#3B82F6' },
      { category: '서버', percentage: 45, color: '#10B981' },
      { category: 'Others', percentage: 15, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '68', unit: '%' },
      { label: '수율', value: '75', unit: '%' },
      { label: '공폐율', value: '3.5', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('45', '68', '68', '1.8', '75'),
    productMixTrend: [
      { quarter: 'Q1 25', values: { PC: 42, '서버': 43, Others: 15 } },
      { quarter: 'Q2 25', values: { PC: 41, '서버': 44, Others: 15 } },
      { quarter: 'Q3 25', values: { PC: 41, '서버': 44, Others: 15 } },
      { quarter: 'Q4 25', values: { PC: 40, '서버': 45, Others: 15 } },
    ],
    waferInput: genWaferInput(42),
    monthlyMetrics: genMonthlyMetrics(42, 36, 2.0, 68, 68),
    waferInOutQuarterly: genWaferInOutQuarterly(42, 40),
    bitGrowthQuarterly: genBitGrowthQuarterly(3.2),
    scrapRate: [
      { label: '내부 공폐', internal: 3.0, external: 2.5 },
      { label: '기관 공폐', internal: 0.5, external: 0.8 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Bloomberg', date: '1/20', title: 'Intel Foundry 18A 공정 개발 진행, 외부 수주 확대 목표' },
      { source: 'Reuters', date: '1/15', title: 'Intel IFS 분사 추진, 독립 파운드리 경쟁력 강화' },
      { source: 'Digitimes', date: '1/10', title: 'Intel 20A 공정 양산 시작, 수율 개선 과제' },
      { source: 'TrendForce', date: '1/18', title: 'Intel 파운드리 가동률 68%로 저조, 외부 수주 확보 시급' },
      { source: 'Omdia', date: '1/22', title: 'Intel CHIPS Act 보조금 $8.5B 확정, 미국 팹 투자 가속' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: '18A 공정 개발 진행 중. 파운드리 사업 분사 추진. 가동률 회복 필요.',
    },
    foundryData: 'Intel 18A: 2025H2 목표, Intel 20A 양산 중',
    mktInfo: 'IFS 파운드리 시장 진입 중',
  },
  Total_Foundry: {
    customerId: 'Total_Foundry',
    label: 'Total Foundry',
    type: 'foundry',
    productMix: [
      { category: 'Advanced (<7nm)', percentage: 35, color: '#3B82F6' },
      { category: 'Mature (>=28nm)', percentage: 45, color: '#10B981' },
      { category: 'Specialty', percentage: 20, color: '#F59E0B' },
    ],
    kpiMetrics: [
      { label: '총 투입량', value: '520', unit: 'Km²' },
      { label: '평균 가동률', value: '82', unit: '%' },
      { label: '평균 공폐율', value: '1.8', unit: '%' },
    ],
    configurableKpis: genConfigurableKpis('48', '95', '82', '9.2', '80'),
    productMixTrend: [
      { quarter: 'Q1 25', values: { 'Advanced': 33, 'Mature': 47, 'Specialty': 20 } },
      { quarter: 'Q2 25', values: { 'Advanced': 34, 'Mature': 46, 'Specialty': 20 } },
      { quarter: 'Q3 25', values: { 'Advanced': 34, 'Mature': 46, 'Specialty': 20 } },
      { quarter: 'Q4 25', values: { 'Advanced': 35, 'Mature': 45, 'Specialty': 20 } },
    ],
    waferInput: genWaferInput(520),
    monthlyMetrics: genMonthlyMetrics(520, 480, 1.5, 82, 95),
    waferInOutQuarterly: genWaferInOutQuarterly(520, 500),
    bitGrowthQuarterly: genBitGrowthQuarterly(5.0),
    scrapRate: [
      { label: '내부 공폐', internal: 1.6, external: 1.4 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'UBS', waferBitOut: '520K wsm', bitGrowth: '+5.0%', gap: '2.8%' },
      { source: 'TrendForce', waferBitOut: '510K wsm', bitGrowth: '+4.5%', gap: '4.1%' },
    ],
    news: [
      { source: 'TrendForce', date: '1/20', title: '2025 글로벌 파운드리 시장 +8% 성장 전망' },
      { source: 'Omdia', date: '1/18', title: '파운드리 가동률 회복세, AI칩 수요 견인' },
      { source: 'Gartner', date: '1/10', title: '2025 파운드리 시장 $150B 전망' },
      { source: 'Bloomberg', date: '1/15', title: '글로벌 파운드리 CapEx 확대 사이클 진입' },
      { source: 'Reuters', date: '1/22', title: '첨단공정 경쟁 심화, 3nm 이하 수주 확대' },
    ],
    weeklySummary: {
      weekLabel: 'Week 1, Mar 2026',
      comment: '전체 파운드리 시장 AI칩 수요 중심 성장. 첨단공정 경쟁 심화. 성숙공정 가동률 회복.',
    },
  },
};

// --- Post-processing: add DRAM ratio and version comparison data ---

function addDramRatio(data: MonthlyMetricData[], baseRatio: number): MonthlyMetricData[] {
  return data.map((d, i) => ({
    ...d,
    dramRatio: +(baseRatio + (seededValue(i * 29 + baseRatio * 100) - 0.5) * 0.04).toFixed(3),
  }));
}

function genPrevVersionMetrics(current: MonthlyMetricData[]): MonthlyMetricData[] {
  return current.map((d, i) => ({
    ...d,
    waferInput: +(d.waferInput * (0.97 + seededValue(i * 31 + 777) * 0.04)).toFixed(1),
    purchaseVolume: +(d.purchaseVolume * (0.97 + seededValue(i * 37 + 888) * 0.04)).toFixed(1),
    inventoryMonths: +(d.inventoryMonths * (0.98 + seededValue(i * 41 + 999) * 0.03)).toFixed(1),
    utilization: +(d.utilization * (0.99 + seededValue(i * 43 + 111) * 0.02)).toFixed(1),
    inventoryLevel: +(d.inventoryLevel * (0.98 + seededValue(i * 47 + 222) * 0.03)).toFixed(1),
    capa: +(d.capa * (0.99 + seededValue(i * 53 + 333) * 0.02)).toFixed(1),
  }));
}

const DRAM_RATIOS: Partial<Record<CustomerDetailId, number>> = {
  SEC: 0.65,
  SKHynix: 0.70,
  Micron: 0.60,
  Koxia: 0.20,
  Total_DRAM_NAND: 0.55,
};

// Enrich all customers with version data and DRAM ratios
for (const id of Object.keys(CUSTOMER_EXECUTIVES) as CustomerDetailId[]) {
  const exec = CUSTOMER_EXECUTIVES[id];
  const ratio = DRAM_RATIOS[id];
  if (ratio !== undefined) {
    exec.monthlyMetrics = addDramRatio(exec.monthlyMetrics, ratio);
  }
  exec.monthlyMetricsPrev = genPrevVersionMetrics(exec.monthlyMetrics);
  exec.versionLabel = '26년 2월 집계';
  exec.prevVersionLabel = '26년 1월 집계';
}
