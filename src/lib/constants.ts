import { CompanyDefinition, CompanyId } from '@/types/company';
import { MetricDefinition, MetricKey } from '@/types/dashboard';

export const COMPANIES: Record<CompanyId, CompanyDefinition> = {
  shinEtsu: {
    id: 'shinEtsu',
    symbol: '4063.T',
    nameKo: '신에츠화학',
    nameEn: 'Shin-Etsu Chemical',
    newsQueryKo: '신에츠화학 반도체 웨이퍼',
    newsQueryEn: 'Shin-Etsu Chemical semiconductor wafer',
    exchange: 'TSE',
    currency: 'JPY',
    color: '#3B82F6', // Blue
  },
  sumco: {
    id: 'sumco',
    symbol: '3436.T',
    nameKo: 'SUMCO',
    nameEn: 'SUMCO Corporation',
    newsQueryKo: 'SUMCO 웨이퍼',
    newsQueryEn: 'SUMCO semiconductor wafer',
    exchange: 'TSE',
    currency: 'JPY',
    color: '#10B981', // Green
  },
  globalWafers: {
    id: 'globalWafers',
    symbol: '6488.TWO',
    nameKo: '글로벌웨이퍼스',
    nameEn: 'GlobalWafers',
    newsQueryKo: '글로벌웨이퍼스',
    newsQueryEn: 'GlobalWafers semiconductor wafer',
    exchange: 'TWSE',
    currency: 'TWD',
    color: '#F59E0B', // Amber
  },
  siltronic: {
    id: 'siltronic',
    symbol: 'WAF.DE',
    nameKo: '실트로닉',
    nameEn: 'Siltronic AG',
    newsQueryKo: '실트로닉 Siltronic',
    newsQueryEn: 'Siltronic semiconductor wafer',
    exchange: 'XETRA',
    currency: 'EUR',
    color: '#EF4444', // Red
  },
  skSiltron: {
    id: 'skSiltron',
    symbol: '029270',
    nameKo: 'SK실트론',
    nameEn: 'SK Siltron',
    newsQueryKo: 'SK실트론',
    newsQueryEn: 'SK Siltron semiconductor wafer',
    exchange: 'DART',
    currency: 'KRW',
    color: '#8B5CF6', // Purple
  },
};

export const COMPANY_IDS: CompanyId[] = ['shinEtsu', 'sumco', 'globalWafers', 'siltronic', 'skSiltron'];

// Yahoo Finance로 데이터를 가져오는 회사 (DART 제외)
export const YAHOO_COMPANY_IDS: CompanyId[] = ['shinEtsu', 'sumco', 'globalWafers', 'siltronic'];

// DART API로 데이터를 가져오는 회사
export const DART_COMPANY_IDS: CompanyId[] = ['skSiltron'];

// DART 고유번호 매핑
export const DART_CORP_CODES: Record<string, string> = {
  skSiltron: '00138020',
};

export const METRICS: MetricDefinition[] = [
  { key: 'revenue', labelKo: '매출', labelEn: 'Revenue' },
  { key: 'operatingIncome', labelKo: '영업이익', labelEn: 'Operating Income' },
  { key: 'netIncome', labelKo: '순이익', labelEn: 'Net Income' },
  { key: 'ebitda', labelKo: 'EBITDA', labelEn: 'EBITDA' },
];

export const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: '매출',
  operatingIncome: '영업이익',
  netIncome: '순이익',
  ebitda: 'EBITDA',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  JPY: '¥',
  TWD: 'NT$',
  EUR: '€',
  KRW: '₩',
};

export const GROWTH_LABELS = {
  qoq: '전분기 대비 (QoQ)',
  yoy: '전년 동기 대비 (YoY)',
} as const;
