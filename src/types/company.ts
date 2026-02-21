export type CompanyId = 'shinEtsu' | 'sumco' | 'globalWafers' | 'siltronic' | 'skSiltron';

export interface CompanyDefinition {
  id: CompanyId;
  symbol: string;
  nameKo: string;
  nameEn: string;
  newsQueryKo: string;
  newsQueryEn: string;
  exchange: string;
  currency: string;
  color: string;
}

export interface QuarterlyFinancial {
  date: string;
  calendarYear: string;
  period: string;
  quarter: string; // e.g., "2024 Q3"
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  operatingMargin: number;
  netMargin: number;
  currency: string;
  // KRW converted values
  revenueKRW: number;
  operatingIncomeKRW: number;
  netIncomeKRW: number;
  ebitdaKRW: number;
  exchangeRate: number;
}

export interface GrowthRate {
  revenueQoQ: number | null;
  revenueYoY: number | null;
  operatingIncomeQoQ: number | null;
  operatingIncomeYoY: number | null;
  netIncomeQoQ: number | null;
  netIncomeYoY: number | null;
  ebitdaQoQ: number | null;
  ebitdaYoY: number | null;
}

export interface CompanyFinancialData {
  company: CompanyDefinition;
  quarterlies: QuarterlyFinancial[];
  latestGrowth: GrowthRate;
  error?: string;
}
