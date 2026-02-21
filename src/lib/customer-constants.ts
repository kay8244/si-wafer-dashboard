import { CustomerDefinition, DramCustomerId } from '@/types/customer';

export const DRAM_CUSTOMERS: Record<DramCustomerId, CustomerDefinition> = {
  samsungDS: {
    id: 'samsungDS',
    symbol: '005930.KS',
    nameKo: '삼성전자 DS',
    nameEn: 'Samsung DS',
    newsQueryKo: '삼성전자 반도체 DRAM HBM',
    newsQueryEn: 'Samsung Electronics semiconductor DRAM HBM',
    currency: 'KRW',
    color: '#1E40AF',
  },
  skHynix: {
    id: 'skHynix',
    symbol: '000660.KS',
    nameKo: 'SK하이닉스',
    nameEn: 'SK Hynix',
    newsQueryKo: 'SK하이닉스 DRAM HBM',
    newsQueryEn: 'SK Hynix DRAM HBM memory',
    currency: 'KRW',
    color: '#DC2626',
  },
  micron: {
    id: 'micron',
    symbol: 'MU',
    nameKo: '마이크론',
    nameEn: 'Micron',
    newsQueryKo: '마이크론 DRAM HBM',
    newsQueryEn: 'Micron Technology DRAM HBM memory',
    currency: 'USD',
    color: '#7C3AED',
  },
};

export const DRAM_CUSTOMER_IDS: DramCustomerId[] = ['samsungDS', 'skHynix', 'micron'];

export const DRAM_FINANCIAL_METRICS = [
  { key: 'revenue' as const, labelKo: '매출' },
  { key: 'operatingIncome' as const, labelKo: '영업이익' },
  { key: 'netIncome' as const, labelKo: '순이익' },
  { key: 'ebitda' as const, labelKo: 'EBITDA' },
];

export type DramMetricKey = 'asp' | 'bitShipment' | 'hbm' | 'capex' | 'utilization' | 'inventory' | 'techNode';

export const DRAM_METRIC_NEWS_QUERIES: Record<DramMetricKey, {
  labelKo: string;
  queryKo: string;
  queryEn: string;
  color: string;
}> = {
  asp: {
    labelKo: 'DRAM ASP',
    queryKo: 'DRAM ASP 평균판매가격 가격 동향',
    queryEn: 'DRAM ASP average selling price trend',
    color: '#F59E0B',
  },
  bitShipment: {
    labelKo: 'Bit 출하량',
    queryKo: 'DRAM 출하량 비트성장 수요',
    queryEn: 'DRAM bit shipment growth demand',
    color: '#3B82F6',
  },
  hbm: {
    labelKo: 'HBM',
    queryKo: 'HBM 고대역폭메모리 삼성 하이닉스 마이크론',
    queryEn: 'HBM high bandwidth memory Samsung Hynix Micron',
    color: '#8B5CF6',
  },
  capex: {
    labelKo: '설비투자 (Capex)',
    queryKo: '반도체 DRAM 설비투자 증설',
    queryEn: 'semiconductor DRAM capex capital expenditure',
    color: '#10B981',
  },
  utilization: {
    labelKo: '가동률',
    queryKo: 'DRAM 가동률 반도체 생산 감산',
    queryEn: 'DRAM utilization rate semiconductor production',
    color: '#EF4444',
  },
  inventory: {
    labelKo: '재고일수',
    queryKo: 'DRAM 재고 반도체 메모리 재고일수',
    queryEn: 'DRAM inventory days semiconductor memory',
    color: '#6366F1',
  },
  techNode: {
    labelKo: '기술노드',
    queryKo: 'DRAM 미세공정 1a 1b 1g EUV',
    queryEn: 'DRAM technology node 1alpha 1beta EUV process',
    color: '#14B8A6',
  },
};

export const DRAM_SPECIFIC_METRICS = [
  { key: 'asp' as const, labelKo: 'DRAM ASP', unit: 'USD/Gb' },
  { key: 'bitShipmentGrowthQoQ' as const, labelKo: 'Bit 출하 QoQ', unit: '%' },
  { key: 'capex' as const, labelKo: '설비투자', unit: 'currency' },
  { key: 'hbmRatio' as const, labelKo: 'HBM 비중', unit: '%' },
  { key: 'inventoryDays' as const, labelKo: '재고일수', unit: '일' },
  { key: 'utilizationRate' as const, labelKo: '가동률', unit: '%' },
];
