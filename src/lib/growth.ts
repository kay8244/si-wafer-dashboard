import { QuarterlyFinancial, GrowthRate } from '@/types/company';
import { MetricKey } from '@/types/dashboard';

function calcGrowthRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function calculateGrowthRates(quarterlies: QuarterlyFinancial[]): GrowthRate {
  const nullGrowth: GrowthRate = {
    revenueQoQ: null,
    revenueYoY: null,
    operatingIncomeQoQ: null,
    operatingIncomeYoY: null,
    netIncomeQoQ: null,
    netIncomeYoY: null,
    ebitdaQoQ: null,
    ebitdaYoY: null,
  };

  if (quarterlies.length < 2) return nullGrowth;

  const latest = quarterlies[quarterlies.length - 1];
  const prevQuarter = quarterlies[quarterlies.length - 2];

  // Find same quarter from previous year
  const prevYear = quarterlies.find(
    (q) =>
      q.period === latest.period &&
      q.calendarYear === String(Number(latest.calendarYear) - 1)
  );

  return {
    revenueQoQ: calcGrowthRate(latest.revenue, prevQuarter.revenue),
    revenueYoY: prevYear ? calcGrowthRate(latest.revenue, prevYear.revenue) : null,
    operatingIncomeQoQ: calcGrowthRate(latest.operatingIncome, prevQuarter.operatingIncome),
    operatingIncomeYoY: prevYear
      ? calcGrowthRate(latest.operatingIncome, prevYear.operatingIncome)
      : null,
    netIncomeQoQ: calcGrowthRate(latest.netIncome, prevQuarter.netIncome),
    netIncomeYoY: prevYear ? calcGrowthRate(latest.netIncome, prevYear.netIncome) : null,
    ebitdaQoQ: calcGrowthRate(latest.ebitda, prevQuarter.ebitda),
    ebitdaYoY: prevYear ? calcGrowthRate(latest.ebitda, prevYear.ebitda) : null,
  };
}

export function getGrowthForMetric(
  growth: GrowthRate,
  metric: MetricKey
): { qoq: number | null; yoy: number | null } {
  switch (metric) {
    case 'revenue':
      return { qoq: growth.revenueQoQ, yoy: growth.revenueYoY };
    case 'operatingIncome':
      return { qoq: growth.operatingIncomeQoQ, yoy: growth.operatingIncomeYoY };
    case 'netIncome':
      return { qoq: growth.netIncomeQoQ, yoy: growth.netIncomeYoY };
    case 'ebitda':
      return { qoq: growth.ebitdaQoQ, yoy: growth.ebitdaYoY };
  }
}
