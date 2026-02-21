import { GrowthRate, QuarterlyFinancial } from './company';

export type NandCustomerId = 'samsungNand' | 'skHynixNand' | 'westernDigital';

export interface NandCustomerDefinition {
  id: NandCustomerId;
  symbol: string;
  nameKo: string;
  nameEn: string;
  newsQueryKo: string;
  newsQueryEn: string;
  currency: string;
  color: string;
}

export interface NandMetrics {
  quarter: string;
  asp: number | null;
  aspChangeQoQ: number | null;
  bitShipmentGrowthQoQ: number | null;
  bitShipmentGrowthYoY: number | null;
  capex: number;
  capexKRW: number;
  qlcRatio: number | null;
  inventoryDays: number | null;
  utilizationRate: number | null;
  layerStack: {
    layer128: number | null;
    layer176: number | null;
    layer232: number | null;
    legacy: number | null;
  } | null;
}

export interface NandCustomerData {
  customer: NandCustomerDefinition;
  segmentFinancials: QuarterlyFinancial[];
  nandMetrics: NandMetrics[];
  latestGrowth: GrowthRate;
  error?: string;
}

export interface NandDashboardData {
  customers: Record<NandCustomerId, NandCustomerData>;
  lastUpdated: string;
  errors: string[];
}
