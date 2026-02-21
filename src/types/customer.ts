import { GrowthRate, QuarterlyFinancial } from './company';

// DRAM 고객사 ID
export type DramCustomerId = 'samsungDS' | 'skHynix' | 'micron';

// 고객사 정의
export interface CustomerDefinition {
  id: DramCustomerId;
  symbol: string;
  nameKo: string;
  nameEn: string;
  newsQueryKo: string;
  newsQueryEn: string;
  currency: string;
  color: string;
}

// DRAM 특화 지표 (수동입력 - API로 수집 불가한 데이터)
export interface DramMetrics {
  quarter: string;
  asp: number | null;
  aspChangeQoQ: number | null;
  bitShipmentGrowthQoQ: number | null;
  bitShipmentGrowthYoY: number | null;
  capex: number;
  capexKRW: number;
  hbmRevenue: number | null;
  hbmRatio: number | null;
  inventoryDays: number | null;
  utilizationRate: number | null;
  techNode: {
    node1a: number | null;
    node1b: number | null;
    node1g: number | null;
    legacy: number | null;
  } | null;
}

// 고객사 전체 데이터
// segmentFinancials: Yahoo Finance에서 가져온 재무실적
// dramMetrics: JSON 수동입력 DRAM 특화 지표
export interface DramCustomerData {
  customer: CustomerDefinition;
  segmentFinancials: QuarterlyFinancial[];
  dramMetrics: DramMetrics[];
  latestGrowth: GrowthRate;
  error?: string;
}

// 대시보드 응답
export interface DramDashboardData {
  customers: Record<DramCustomerId, DramCustomerData>;
  lastUpdated: string;
  errors: string[];
}
