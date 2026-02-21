import type { QuarterlyStatement, ExchangeRateMap } from './yahoo-client';
import { QuarterlyFinancial } from '@/types/company';

function dateToQuarterLabel(date: Date): { calendarYear: string; period: string; quarter: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  let q: string;
  if (month <= 3) q = 'Q1';
  else if (month <= 6) q = 'Q2';
  else if (month <= 9) q = 'Q3';
  else q = 'Q4';

  return {
    calendarYear: String(year),
    period: q,
    quarter: `${year} ${q}`,
  };
}

export function transformYahooStatements(
  statements: QuarterlyStatement[],
  currency: string,
  exchangeRates: ExchangeRateMap
): QuarterlyFinancial[] {
  return statements
    .map((stmt) => {
      const revenue = stmt.totalRevenue;
      const operatingIncome = stmt.operatingIncome;
      const netIncome = stmt.netIncome;
      const ebitda = stmt.ebitda;
      const { calendarYear, period, quarter } = dateToQuarterLabel(stmt.date);

      const dateStr = stmt.date.toISOString().split('T')[0];
      const rate = exchangeRates.get(dateStr) || 0;

      return {
        date: dateStr,
        calendarYear,
        period,
        quarter,
        revenue,
        operatingIncome,
        netIncome,
        ebitda,
        operatingMargin: revenue !== 0 ? operatingIncome / revenue : 0,
        netMargin: revenue !== 0 ? netIncome / revenue : 0,
        currency,
        revenueKRW: Math.round(revenue * rate),
        operatingIncomeKRW: Math.round(operatingIncome * rate),
        netIncomeKRW: Math.round(netIncome * rate),
        ebitdaKRW: Math.round(ebitda * rate),
        exchangeRate: rate,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // oldest first
}
