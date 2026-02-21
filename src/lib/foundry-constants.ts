import { FoundryCustomerDefinition, FoundryCustomerId } from '@/types/foundry-customer';

export const FOUNDRY_CUSTOMERS: Record<FoundryCustomerId, FoundryCustomerDefinition> = {
  tsmc: {
    id: 'tsmc',
    symbol: 'TSM',
    nameKo: 'TSMC',
    nameEn: 'TSMC',
    newsQueryKo: 'TSMC 파운드리 반도체 위탁생산',
    newsQueryEn: 'TSMC foundry semiconductor manufacturing',
    currency: 'USD',
    color: '#1E40AF',
  },
  samsungFoundry: {
    id: 'samsungFoundry',
    symbol: '005930.KS',
    nameKo: '삼성 파운드리',
    nameEn: 'Samsung Foundry',
    newsQueryKo: '삼성전자 파운드리 위탁생산 GAA',
    newsQueryEn: 'Samsung Foundry semiconductor GAA manufacturing',
    currency: 'KRW',
    color: '#DC2626',
  },
  globalFoundries: {
    id: 'globalFoundries',
    symbol: 'GFS',
    nameKo: '글로벌파운드리즈',
    nameEn: 'GlobalFoundries',
    newsQueryKo: '글로벌파운드리즈 파운드리',
    newsQueryEn: 'GlobalFoundries semiconductor foundry',
    currency: 'USD',
    color: '#7C3AED',
  },
};

export const FOUNDRY_CUSTOMER_IDS: FoundryCustomerId[] = ['tsmc', 'samsungFoundry', 'globalFoundries'];

export const FOUNDRY_FINANCIAL_METRICS = [
  { key: 'revenue' as const, labelKo: '매출' },
  { key: 'operatingIncome' as const, labelKo: '영업이익' },
  { key: 'netIncome' as const, labelKo: '순이익' },
  { key: 'ebitda' as const, labelKo: 'EBITDA' },
];

export type FoundryMetricKey = 'waferAsp' | 'waferShipment' | 'advancedNode' | 'capex' | 'utilization' | 'inventory' | 'processNode';

export const FOUNDRY_METRIC_NEWS_QUERIES: Record<FoundryMetricKey, {
  labelKo: string;
  queryKo: string;
  queryEn: string;
  color: string;
}> = {
  waferAsp: {
    labelKo: '웨이퍼 ASP',
    queryKo: '파운드리 웨이퍼 ASP 가격 동향',
    queryEn: 'foundry wafer ASP price trend',
    color: '#F59E0B',
  },
  waferShipment: {
    labelKo: '웨이퍼 출하량',
    queryKo: '파운드리 웨이퍼 출하량 수요',
    queryEn: 'foundry wafer shipment demand',
    color: '#3B82F6',
  },
  advancedNode: {
    labelKo: '첨단 노드 비중',
    queryKo: '파운드리 첨단공정 7나노 5나노 3나노 비중',
    queryEn: 'foundry advanced node 7nm 5nm 3nm revenue ratio',
    color: '#8B5CF6',
  },
  capex: {
    labelKo: '설비투자 (Capex)',
    queryKo: '파운드리 설비투자 증설 팹',
    queryEn: 'foundry capex capital expenditure fab expansion',
    color: '#10B981',
  },
  utilization: {
    labelKo: '가동률',
    queryKo: '파운드리 가동률 반도체 생산',
    queryEn: 'foundry utilization rate semiconductor production',
    color: '#EF4444',
  },
  inventory: {
    labelKo: '재고일수',
    queryKo: '파운드리 재고 반도체 웨이퍼',
    queryEn: 'foundry inventory days semiconductor wafer',
    color: '#6366F1',
  },
  processNode: {
    labelKo: '공정 노드',
    queryKo: '파운드리 공정 3나노 5나노 7나노 GAA EUV',
    queryEn: 'foundry process node 3nm 5nm 7nm GAA EUV technology',
    color: '#14B8A6',
  },
};

export const FOUNDRY_SPECIFIC_METRICS = [
  { key: 'waferAsp' as const, labelKo: '웨이퍼 ASP', unit: 'USD/wafer' },
  { key: 'waferShipmentGrowthQoQ' as const, labelKo: '출하량 QoQ', unit: '%' },
  { key: 'capex' as const, labelKo: '설비투자', unit: 'currency' },
  { key: 'advancedNodeRatio' as const, labelKo: '첨단 노드 비중', unit: '%' },
  { key: 'inventoryDays' as const, labelKo: '재고일수', unit: '일' },
  { key: 'utilizationRate' as const, labelKo: '가동률', unit: '%' },
];
