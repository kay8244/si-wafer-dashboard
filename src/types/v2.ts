// ============================================================
// V2 Dashboard Types
// ============================================================

// --- 전방시장 (Supply Chain) ---

export type SupplyChainCategoryId = 'wafer' | 'macro' | 'application' | 'semiconductor' | 'equipment';

export interface SupplyChainCategory {
  id: SupplyChainCategoryId;
  label: string;
  indicators: SupplyChainIndicator[];
}

export type ViewMode = 'actual' | 'threeMonthMA' | 'twelveMonthMA' | 'mom' | 'yoy';

export type LeadingIndicatorRating = '상' | '중' | '하';

export interface SupplyChainIndicator {
  id: string;
  name: string;
  unit: 'K' | 'M' | '%';
  monthly: MonthlyData[];
  semiAnnualEval?: SemiAnnualEval;
  judgment?: string;
  leadingRating?: LeadingIndicatorRating;
}

// 내부 데이터 (고객사별 매출/투입량/가동률)
export type InternalMetricType = 'revenue' | 'waferInput' | 'utilization';

export interface InternalCompanyData {
  id: string;
  name: string;
  metrics: Record<InternalMetricType, { month: string; value: number }[]>;
}

export interface MonthlyData {
  month: string;
  actual: number;
  threeMonthMA: number;
  twelveMonthMA: number;
  mom: number;
  yoy: number;
}

export interface SemiAnnualEval {
  half: 'H1' | 'H2';
  rating: 'positive' | 'neutral' | 'negative';
  value: number;
}

// --- VCM (웨이퍼 수요 예측) ---

export interface VcmVersion {
  id: string;
  label: string;
  date: string;
}

export type ApplicationType =
  | 'traditionalServer'
  | 'aiServer'
  | 'smartphone'
  | 'pcNotebook'
  | 'electricVehicle'
  | 'ioe'
  | 'automotive';

export type DeviceType = 'dram' | 'hbm' | 'nand' | 'foundry' | 'discrete';

export interface ApplicationDemand {
  application: ApplicationType;
  label: string;
  yearly: YearlyValue[];
}

export interface YearlyValue {
  year: number;
  value: number;
  isEstimate: boolean;
}

export interface DeviceWaferDemand {
  device: DeviceType;
  label: string;
  yearly: { year: number; waferDemand: number; isEstimate: boolean }[];
}

export interface MountPerUnit {
  serverType: 'traditional' | 'ai';
  label: string;
  metrics: { year: number; value: number; unit: string }[];
}

export interface TotalWaferDemand {
  year: number;
  total: number;
  isEstimate: boolean;
}

export interface VcmNews {
  source: string;
  date: string;
  title: string;
  summary: string;
}

export interface VcmData {
  versions: VcmVersion[];
  applicationDemands: Record<ApplicationType, ApplicationDemand>;
  deviceWaferDemands: Record<DeviceType, DeviceWaferDemand>;
  mountPerUnit: MountPerUnit[];
  mountPerUnitByApp: Record<ApplicationType, MountPerUnit[]>;
  totalWaferDemand: TotalWaferDemand[];
  totalWaferDemandByApp: Record<ApplicationType, TotalWaferDemand[]>;
  news: VcmNews[];
  newsQueries: Record<ApplicationType, { queryKo: string; queryEn: string }>;
  applicationTable: { application: string; yearly: { year: number; value: number; isEstimate: boolean }[] }[];
  applicationQuarterlyDemands: Record<ApplicationType, QuarterlyValue[]>;
  deviceStackedByApp: Record<ApplicationType, DeviceStackedEntry[]>;
}

// --- 고객별 (Customer Detail) ---

export type MemoryCustomerId = 'SEC' | 'SKHynix' | 'Micron';
export type FoundryCustomerId = 'SEC_Foundry' | 'TSMC' | 'SMC' | 'GFS';
export type CustomerDetailId = MemoryCustomerId | FoundryCustomerId;

export type CustomerMetricId =
  | 'productMix'
  | 'inventoryLevel'
  | 'utilization'
  | 'openOrders'
  | 'siliconResource'
  | 'waferInput'
  | 'purchaseVolume';

export type NewsCategory = 'Product Mix' | '투입량' | '재고수준' | '가동률' | '투입/구매량';

export interface ConfigurableKpi {
  id: CustomerMetricId;
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
}

export interface MonthlyMetricData {
  month: string;
  waferInput: number;
  purchaseVolume: number;
  inventoryMonths: number;
  utilization: number;
  inventoryLevel: number;
}

export interface MonthlyGrowthEntry {
  month: string;
  yoy: number;
  qoq: number;
  mom: number;
}

export interface ProductMixItem {
  category: string;
  percentage: number;
  color: string;
}

export interface KpiMetric {
  label: string;
  value: string;
  unit?: string;
}

export interface WaferInputData {
  quarter: string;
  km2: number;
  km: number;
  kpcs: number;
}

export interface ProductMixTrend {
  quarter: string;
  values: Record<string, number>;
}

export interface ExternalComparison {
  source: string;
  waferBitOut: string;
  bitGrowth: string;
  gap: string;
}

export interface CustomerNews {
  source: string;
  date: string;
  title: string;
  categories?: NewsCategory[];
}

export interface ScrapRate {
  label: string;
  internal: number;
  external: number;
}

export interface WeeklySummary {
  weekLabel: string;
  comment: string;
}

export interface CustomerExecutive {
  customerId: CustomerDetailId;
  label: string;
  type: 'memory' | 'foundry';
  productMix: ProductMixItem[];
  kpiMetrics: KpiMetric[];
  configurableKpis: ConfigurableKpi[];
  productMixTrend: ProductMixTrend[];
  waferInput: WaferInputData[];
  monthlyMetrics: MonthlyMetricData[];
  scrapRate: ScrapRate[];
  externalComparison: ExternalComparison[];
  news: CustomerNews[];
  weeklySummary: WeeklySummary;
  foundryData?: string;
  mktInfo?: string;
  newsQueryKo?: string;
  newsQueryEn?: string;
}

// Quarterly data for bar charts
export interface QuarterlyValue {
  quarter: string;
  value: number;
  isEstimate: boolean;
}

export interface DeviceStackedEntry {
  quarter: string;
  isEstimate: boolean;
  dram: number;
  hbm: number;
  nand: number;
  foundry: number;
  discrete: number;
}

// --- Filter State ---

export interface ApplicationFilterItem {
  type: ApplicationType;
  label: string;
  checked: boolean;
}

export interface DeviceFilterItem {
  type: DeviceType;
  label: string;
  checked: boolean;
}

export type WaferInputUnit = 'km2' | 'km' | 'kpcs';

export type DataSourceToggle = 'memory' | 'nonMemory';
