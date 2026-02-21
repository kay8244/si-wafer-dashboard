import { NandCustomerDefinition, NandCustomerId } from '@/types/nand-customer';

export const NAND_CUSTOMERS: Record<NandCustomerId, NandCustomerDefinition> = {
  samsungNand: {
    id: 'samsungNand',
    symbol: '005930.KS',
    nameKo: '삼성전자 NAND',
    nameEn: 'Samsung NAND',
    newsQueryKo: '삼성전자 NAND 플래시 V-NAND',
    newsQueryEn: 'Samsung Electronics NAND flash V-NAND',
    currency: 'KRW',
    color: '#1E40AF',
  },
  skHynixNand: {
    id: 'skHynixNand',
    symbol: '000660.KS',
    nameKo: 'SK하이닉스 NAND',
    nameEn: 'SK Hynix NAND',
    newsQueryKo: 'SK하이닉스 NAND 솔리다임 Solidigm',
    newsQueryEn: 'SK Hynix NAND Solidigm flash memory',
    currency: 'KRW',
    color: '#DC2626',
  },
  westernDigital: {
    id: 'westernDigital',
    symbol: 'WDC',
    nameKo: 'Western Digital',
    nameEn: 'Western Digital',
    newsQueryKo: '웨스턴디지털 키옥시아 NAND',
    newsQueryEn: 'Western Digital Kioxia NAND flash',
    currency: 'USD',
    color: '#059669',
  },
};

export const NAND_CUSTOMER_IDS: NandCustomerId[] = ['samsungNand', 'skHynixNand', 'westernDigital'];

export const NAND_FINANCIAL_METRICS = [
  { key: 'revenue' as const, labelKo: '매출' },
  { key: 'operatingIncome' as const, labelKo: '영업이익' },
  { key: 'netIncome' as const, labelKo: '순이익' },
  { key: 'ebitda' as const, labelKo: 'EBITDA' },
];

export type NandMetricKey = 'asp' | 'bitShipment' | 'qlc' | 'capex' | 'utilization' | 'inventory' | 'layerStack';

export const NAND_METRIC_NEWS_QUERIES: Record<NandMetricKey, {
  labelKo: string;
  queryKo: string;
  queryEn: string;
  color: string;
}> = {
  asp: {
    labelKo: 'NAND ASP',
    queryKo: 'NAND 플래시 ASP 평균판매가격 가격 동향',
    queryEn: 'NAND flash ASP average selling price trend',
    color: '#F59E0B',
  },
  bitShipment: {
    labelKo: 'Bit 출하량',
    queryKo: 'NAND 출하량 비트성장 수요',
    queryEn: 'NAND flash bit shipment growth demand',
    color: '#3B82F6',
  },
  qlc: {
    labelKo: 'QLC 비중',
    queryKo: 'NAND QLC TLC 기술 전환 비중',
    queryEn: 'NAND QLC TLC technology transition ratio',
    color: '#8B5CF6',
  },
  capex: {
    labelKo: '설비투자 (Capex)',
    queryKo: 'NAND 플래시 설비투자 증설 팹',
    queryEn: 'NAND flash capex capital expenditure fab',
    color: '#10B981',
  },
  utilization: {
    labelKo: '가동률',
    queryKo: 'NAND 가동률 플래시 생산 감산',
    queryEn: 'NAND flash utilization rate production',
    color: '#EF4444',
  },
  inventory: {
    labelKo: '재고일수',
    queryKo: 'NAND 재고 플래시 메모리 재고일수',
    queryEn: 'NAND flash inventory days memory',
    color: '#6366F1',
  },
  layerStack: {
    labelKo: '적층 기술',
    queryKo: 'NAND 적층 레이어 128단 176단 232단 300단',
    queryEn: 'NAND layer stack 128 176 232 300 3D technology',
    color: '#14B8A6',
  },
};

export const NAND_SPECIFIC_METRICS = [
  { key: 'asp' as const, labelKo: 'NAND ASP', unit: 'USD/GB' },
  { key: 'bitShipmentGrowthQoQ' as const, labelKo: 'Bit 출하 QoQ', unit: '%' },
  { key: 'capex' as const, labelKo: '설비투자', unit: 'currency' },
  { key: 'qlcRatio' as const, labelKo: 'QLC 비중', unit: '%' },
  { key: 'inventoryDays' as const, labelKo: '재고일수', unit: '일' },
  { key: 'utilizationRate' as const, labelKo: '가동률', unit: '%' },
];
