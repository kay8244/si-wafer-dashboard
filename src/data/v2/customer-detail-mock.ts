import type { CustomerExecutive, CustomerDetailId } from '@/types/v2';

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

export const CUSTOMER_EXECUTIVES: Record<CustomerDetailId, CustomerExecutive> = {
  SEC: {
    customerId: 'SEC',
    label: 'SEC (삼성전자)',
    type: 'memory',
    newsQueryKo: '삼성전자 반도체 메모리 DRAM',
    newsQueryEn: 'Samsung semiconductor memory DRAM',
    productMix: [
      { category: 'DDR5', percentage: 42, color: '#3B82F6' },
      { category: 'DDR4', percentage: 25, color: '#10B981' },
      { category: 'LPDDR5', percentage: 18, color: '#F59E0B' },
      { category: 'HBM3E', percentage: 10, color: '#EF4444' },
      { category: 'Others', percentage: 5, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '4.2', unit: '건' },
      { label: 'Silicon 자원', value: '87', unit: '%' },
      { label: '공폐율', value: '2.3', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { DDR5: 35, DDR4: 30, LPDDR5: 20, HBM3E: 8, Others: 7 } },
      { quarter: 'Q2 24', values: { DDR5: 38, DDR4: 28, LPDDR5: 19, HBM3E: 9, Others: 6 } },
      { quarter: 'Q3 24', values: { DDR5: 40, DDR4: 26, LPDDR5: 18, HBM3E: 10, Others: 6 } },
      { quarter: 'Q4 24', values: { DDR5: 42, DDR4: 25, LPDDR5: 18, HBM3E: 10, Others: 5 } },
    ],
    waferInput: genWaferInput(45),
    scrapRate: [
      { label: '내부 공폐', internal: 2.1, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '12.5B GB', bitGrowth: '+8.2%', gap: '3.2%' },
      { source: 'TrendForce', waferBitOut: '12.1B GB', bitGrowth: '+7.8%', gap: '6.5%' },
    ],
    news: [
      { source: 'Gartner', date: '1/6', title: '2025 AI 서버 시장 성장 조정치 발표, SEC 수혜 전망' },
      { source: 'Digitimes', date: '1/20', title: 'SEC HBM4 Qual 단일 사이트 대량생산 준비 중' },
      { source: 'TrendForce', date: '1/15', title: '삼성전자 1Q25 DRAM 출하 +5% 전망' },
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
      { category: 'DDR5', percentage: 38, color: '#3B82F6' },
      { category: 'DDR4', percentage: 20, color: '#10B981' },
      { category: 'LPDDR5', percentage: 15, color: '#F59E0B' },
      { category: 'HBM3E', percentage: 22, color: '#EF4444' },
      { category: 'Others', percentage: 5, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '3.8', unit: '건' },
      { label: 'Silicon 자원', value: '92', unit: '%' },
      { label: '공폐율', value: '1.8', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { DDR5: 30, DDR4: 28, LPDDR5: 18, HBM3E: 18, Others: 6 } },
      { quarter: 'Q2 24', values: { DDR5: 33, DDR4: 25, LPDDR5: 17, HBM3E: 19, Others: 6 } },
      { quarter: 'Q3 24', values: { DDR5: 35, DDR4: 22, LPDDR5: 16, HBM3E: 21, Others: 6 } },
      { quarter: 'Q4 24', values: { DDR5: 38, DDR4: 20, LPDDR5: 15, HBM3E: 22, Others: 5 } },
    ],
    waferInput: genWaferInput(52),
    scrapRate: [
      { label: '내부 공폐', internal: 1.5, external: 1.4 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '14.2B GB', bitGrowth: '+12.5%', gap: '2.1%' },
      { source: 'TrendForce', waferBitOut: '13.8B GB', bitGrowth: '+11.8%', gap: '5.0%' },
    ],
    news: [
      { source: 'Digitimes', date: '1/20', title: 'SK하이닉스 HBM4 Qual 4분기 완료 전망' },
      { source: 'TrendForce', date: '1/15', title: 'SK하이닉스 1Q25 HBM 출하 +15% 전망' },
      { source: 'Reuters', date: '1/22', title: 'SK하이닉스 M15X 신공장 착공, 2026년 양산 목표' },
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
      { category: 'DDR5', percentage: 40, color: '#3B82F6' },
      { category: 'DDR4', percentage: 22, color: '#10B981' },
      { category: 'LPDDR5', percentage: 20, color: '#F59E0B' },
      { category: 'HBM3E', percentage: 12, color: '#EF4444' },
      { category: 'Others', percentage: 6, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '개방선인 수', value: '3.5', unit: '건' },
      { label: 'Silicon 자원', value: '85', unit: '%' },
      { label: '공폐율', value: '2.8', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { DDR5: 32, DDR4: 30, LPDDR5: 22, HBM3E: 8, Others: 8 } },
      { quarter: 'Q2 24', values: { DDR5: 35, DDR4: 27, LPDDR5: 21, HBM3E: 10, Others: 7 } },
      { quarter: 'Q3 24', values: { DDR5: 38, DDR4: 24, LPDDR5: 20, HBM3E: 11, Others: 7 } },
      { quarter: 'Q4 24', values: { DDR5: 40, DDR4: 22, LPDDR5: 20, HBM3E: 12, Others: 6 } },
    ],
    waferInput: genWaferInput(38),
    scrapRate: [
      { label: '내부 공폐', internal: 2.5, external: 2.0 },
      { label: '기관 공폐', internal: 0.4, external: 0.6 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '9.8B GB', bitGrowth: '+6.5%', gap: '4.8%' },
      { source: 'TrendForce', waferBitOut: '9.5B GB', bitGrowth: '+5.9%', gap: '7.9%' },
    ],
    news: [
      { source: 'Bloomberg', date: '1/18', title: 'Micron HBM3E 수율 개선, NVIDIA 향 납품 확대' },
      { source: 'TrendForce', date: '1/12', title: 'Micron 1Q25 DRAM 출하 +3% 전망, 보수적 가이던스' },
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
      { category: '3nm', percentage: 15, color: '#3B82F6' },
      { category: '5nm', percentage: 25, color: '#10B981' },
      { category: '7nm', percentage: 20, color: '#F59E0B' },
      { category: '14nm', percentage: 22, color: '#EF4444' },
      { category: 'Others', percentage: 18, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '72', unit: '%' },
      { label: '수율', value: '68', unit: '%' },
      { label: '공폐율', value: '3.2', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { '3nm': 8, '5nm': 22, '7nm': 22, '14nm': 25, Others: 23 } },
      { quarter: 'Q2 24', values: { '3nm': 10, '5nm': 23, '7nm': 21, '14nm': 24, Others: 22 } },
      { quarter: 'Q3 24', values: { '3nm': 12, '5nm': 24, '7nm': 21, '14nm': 23, Others: 20 } },
      { quarter: 'Q4 24', values: { '3nm': 15, '5nm': 25, '7nm': 20, '14nm': 22, Others: 18 } },
    ],
    waferInput: genWaferInput(28),
    scrapRate: [
      { label: '내부 공폐', internal: 2.8, external: 2.2 },
      { label: '기관 공폐', internal: 0.5, external: 0.7 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/15', title: '삼성 파운드리 2nm GAA 공정 개발 가속' },
      { source: 'TheElec', date: '1/20', title: '삼성 파운드리 가동률 회복 중, 1Q25 +5%p 전망' },
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
      { category: '3nm', percentage: 28, color: '#3B82F6' },
      { category: '5nm', percentage: 32, color: '#10B981' },
      { category: '7nm', percentage: 18, color: '#F59E0B' },
      { category: '16nm', percentage: 12, color: '#EF4444' },
      { category: 'Others', percentage: 10, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '95', unit: '%' },
      { label: '수율', value: '92', unit: '%' },
      { label: '공폐율', value: '1.2', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { '3nm': 20, '5nm': 30, '7nm': 20, '16nm': 15, Others: 15 } },
      { quarter: 'Q2 24', values: { '3nm': 23, '5nm': 31, '7nm': 19, '16nm': 14, Others: 13 } },
      { quarter: 'Q3 24', values: { '3nm': 25, '5nm': 32, '7nm': 19, '16nm': 13, Others: 11 } },
      { quarter: 'Q4 24', values: { '3nm': 28, '5nm': 32, '7nm': 18, '16nm': 12, Others: 10 } },
    ],
    waferInput: genWaferInput(85),
    scrapRate: [
      { label: '내부 공폐', internal: 1.0, external: 0.8 },
      { label: '기관 공폐', internal: 0.1, external: 0.3 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/22', title: 'TSMC 4Q24 매출 $26.3B, 사상 최고 기록' },
      { source: 'Digitimes', date: '1/18', title: 'TSMC A16 공정 2026 양산 예정, AI칩 수요 대응' },
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
      { category: '14nm', percentage: 30, color: '#3B82F6' },
      { category: '28nm', percentage: 35, color: '#10B981' },
      { category: '40nm', percentage: 20, color: '#F59E0B' },
      { category: 'Others', percentage: 15, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '78', unit: '%' },
      { label: '수율', value: '85', unit: '%' },
      { label: '공폐율', value: '2.5', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { '14nm': 25, '28nm': 38, '40nm': 22, Others: 15 } },
      { quarter: 'Q2 24', values: { '14nm': 27, '28nm': 37, '40nm': 21, Others: 15 } },
      { quarter: 'Q3 24', values: { '14nm': 28, '28nm': 36, '40nm': 21, Others: 15 } },
      { quarter: 'Q4 24', values: { '14nm': 30, '28nm': 35, '40nm': 20, Others: 15 } },
    ],
    waferInput: genWaferInput(22),
    scrapRate: [
      { label: '내부 공폐', internal: 2.2, external: 1.8 },
      { label: '기관 공폐', internal: 0.3, external: 0.5 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Digitimes', date: '1/10', title: 'SMC 28nm 수요 회복세, 자동차/IoT 수요 증가' },
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
      { category: '12nm', percentage: 22, color: '#3B82F6' },
      { category: '22nm', percentage: 28, color: '#10B981' },
      { category: '40nm', percentage: 25, color: '#F59E0B' },
      { category: 'Others', percentage: 25, color: '#8B5CF6' },
    ],
    kpiMetrics: [
      { label: '가동률', value: '82', unit: '%' },
      { label: '수율', value: '88', unit: '%' },
      { label: '공폐율', value: '2.0', unit: '%' },
    ],
    productMixTrend: [
      { quarter: 'Q1 24', values: { '12nm': 18, '22nm': 30, '40nm': 27, Others: 25 } },
      { quarter: 'Q2 24', values: { '12nm': 19, '22nm': 29, '40nm': 26, Others: 26 } },
      { quarter: 'Q3 24', values: { '12nm': 20, '22nm': 28, '40nm': 26, Others: 26 } },
      { quarter: 'Q4 24', values: { '12nm': 22, '22nm': 28, '40nm': 25, Others: 25 } },
    ],
    waferInput: genWaferInput(18),
    scrapRate: [
      { label: '내부 공폐', internal: 1.8, external: 1.5 },
      { label: '기관 공폐', internal: 0.2, external: 0.4 },
    ],
    externalComparison: [
      { source: 'Omdia', waferBitOut: '-', bitGrowth: '-', gap: '-' },
      { source: 'TrendForce', waferBitOut: '-', bitGrowth: '-', gap: '-' },
    ],
    news: [
      { source: 'Reuters', date: '1/14', title: 'GlobalFoundries 자동차/산업용 반도체 수주 확대' },
    ],
    weeklySummary: {
      weekLabel: 'Week 4, Jan 2026',
      comment: '특화 공정(RF-SOI, SiGe) 수요 안정. 자동차향 성장 지속.',
    },
    foundryData: 'RF-SOI, SiGe BiCMOS 특화',
    mktInfo: 'Foundry 시장 점유율 5% (TrendForce)',
  },
};
