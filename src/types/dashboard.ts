import { CompanyFinancialData, CompanyId } from './company';

export type MetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';

export interface MetricDefinition {
  key: MetricKey;
  labelKo: string;
  labelEn: string;
}

export interface ChartDataPoint {
  quarter: string;
  [companyId: string]: number | string; // company values + quarter label
}

export interface GrowthChartDataPoint {
  quarter: string;
  [companyId: string]: number | string | null;
}

export interface DashboardData {
  companies: Record<CompanyId, CompanyFinancialData>;
  lastUpdated: string;
  errors: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  lastUpdated?: string;
}
