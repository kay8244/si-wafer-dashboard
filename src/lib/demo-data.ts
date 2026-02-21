import { CompanyFinancialData, CompanyId, QuarterlyFinancial } from '@/types/company';
import { DashboardData } from '@/types/dashboard';
import { COMPANIES } from './constants';
import { calculateGrowthRates } from './growth';

// Approximate exchange rates to KRW
const DEMO_RATES: Record<string, number> = {
  JPY: 9.2,    // ¥1 = ₩9.2
  TWD: 43.5,   // NT$1 = ₩43.5
  EUR: 1500,   // €1 = ₩1500
};

function generateQuarterlies(
  currency: string,
  baseRevenue: number,
  baseOI: number,
  baseNI: number,
  baseEBITDA: number,
  volatility: number = 0.08
): QuarterlyFinancial[] {
  const quarters: QuarterlyFinancial[] = [];
  const years = [2023, 2024, 2025];
  const periods = ['Q1', 'Q2', 'Q3', 'Q4'];
  const rate = DEMO_RATES[currency] || 1;

  for (const year of years) {
    for (const period of periods) {
      if (year === 2025 && (period === 'Q3' || period === 'Q4')) continue;

      const factor = 1 + (Math.sin(year * 4 + periods.indexOf(period)) * volatility);
      const trend = 1 + ((year - 2023) * 0.03);

      const rev = Math.round(baseRevenue * factor * trend);
      const oi = Math.round(baseOI * factor * trend * (0.9 + Math.random() * 0.2));
      const ni = Math.round(baseNI * factor * trend * (0.9 + Math.random() * 0.2));
      const ebitda = Math.round(baseEBITDA * factor * trend * (0.9 + Math.random() * 0.2));

      const monthEnd = period === 'Q1' ? '03-31' : period === 'Q2' ? '06-30' : period === 'Q3' ? '09-30' : '12-31';

      quarters.push({
        date: `${year}-${monthEnd}`,
        calendarYear: String(year),
        period,
        quarter: `${year} ${period}`,
        revenue: rev,
        operatingIncome: oi,
        netIncome: ni,
        ebitda,
        operatingMargin: rev !== 0 ? oi / rev : 0,
        netMargin: rev !== 0 ? ni / rev : 0,
        currency,
        revenueKRW: Math.round(rev * rate),
        operatingIncomeKRW: Math.round(oi * rate),
        netIncomeKRW: Math.round(ni * rate),
        ebitdaKRW: Math.round(ebitda * rate),
        exchangeRate: rate,
      });
    }
  }

  return quarters;
}

// Shin-Etsu Chemical: ~600B JPY quarterly revenue
const shinEtsuQuarterlies = generateQuarterlies('JPY', 600_000_000_000, 180_000_000_000, 130_000_000_000, 220_000_000_000, 0.06);

// SUMCO: ~100B JPY quarterly revenue
const sumcoQuarterlies = generateQuarterlies('JPY', 100_000_000_000, 15_000_000_000, 10_000_000_000, 25_000_000_000, 0.10);

// GlobalWafers: ~16B TWD quarterly revenue
const globalWafersQuarterlies = generateQuarterlies('TWD', 16_000_000_000, 3_500_000_000, 2_500_000_000, 5_000_000_000, 0.08);

// Siltronic: ~350M EUR quarterly revenue
const siltronicQuarterlies = generateQuarterlies('EUR', 350_000_000, 30_000_000, 15_000_000, 80_000_000, 0.12);

// SK Siltron: ~500B KRW quarterly revenue
const skSiltronQuarterlies = generateQuarterlies('KRW', 500_000_000_000, 50_000_000_000, 30_000_000_000, 90_000_000_000, 0.09);

function buildCompanyData(id: CompanyId, quarterlies: QuarterlyFinancial[]): CompanyFinancialData {
  return {
    company: COMPANIES[id],
    quarterlies,
    latestGrowth: calculateGrowthRates(quarterlies),
  };
}

export function getDemoData(): DashboardData {
  return {
    companies: {
      shinEtsu: buildCompanyData('shinEtsu', shinEtsuQuarterlies),
      sumco: buildCompanyData('sumco', sumcoQuarterlies),
      globalWafers: buildCompanyData('globalWafers', globalWafersQuarterlies),
      siltronic: buildCompanyData('siltronic', siltronicQuarterlies),
      skSiltron: buildCompanyData('skSiltron', skSiltronQuarterlies),
    },
    lastUpdated: new Date().toISOString(),
    errors: ['데모 데이터를 사용 중입니다. Yahoo Finance API 연결을 확인하세요.'],
  };
}
