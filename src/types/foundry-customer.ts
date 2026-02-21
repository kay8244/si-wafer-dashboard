import { GrowthRate, QuarterlyFinancial } from './company';

export type FoundryCustomerId = 'tsmc' | 'samsungFoundry' | 'globalFoundries';

export interface FoundryCustomerDefinition {
  id: FoundryCustomerId;
  symbol: string;
  nameKo: string;
  nameEn: string;
  newsQueryKo: string;
  newsQueryEn: string;
  currency: string;
  color: string;
}

export interface FoundryMetrics {
  quarter: string;
  waferAsp: number | null;
  waferAspChangeQoQ: number | null;
  waferShipmentsK: number | null;
  waferShipmentGrowthQoQ: number | null;
  waferShipmentGrowthYoY: number | null;
  capex: number;
  capexKRW: number;
  utilizationRate: number | null;
  advancedNodeRatio: number | null;
  inventoryDays: number | null;
  processNode: {
    node3nm: number | null;
    node5nm: number | null;
    node7nm: number | null;
    legacy: number | null;
  } | null;
}

export interface FoundryCustomerData {
  customer: FoundryCustomerDefinition;
  segmentFinancials: QuarterlyFinancial[];
  foundryMetrics: FoundryMetrics[];
  latestGrowth: GrowthRate;
  error?: string;
}

export interface FoundryDashboardData {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  lastUpdated: string;
  errors: string[];
}
