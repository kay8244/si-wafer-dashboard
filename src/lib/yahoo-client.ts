import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface QuarterlyStatement {
  date: Date;
  totalRevenue: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
}

export interface YahooQuarterlyResult {
  symbol: string;
  statements: QuarterlyStatement[];
}

export type ExchangeRateMap = Map<string, number>; // dateStr -> rate

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value === 'number') return new Date(value * 1000);
  return null;
}

async function fetchViaFundamentals(symbol: string): Promise<QuarterlyStatement[]> {
  const results = await yahooFinance.fundamentalsTimeSeries(
    symbol,
    {
      period1: '2022-01-01',
      type: 'quarterly',
      module: 'all',
    },
    { validateResult: false }
  );

  const rawResults = results as Array<Record<string, unknown>>;
  if (!rawResults || rawResults.length === 0) return [];

  return rawResults
    .filter((r) => parseDate(r.date) !== null && Number(r.totalRevenue) > 0)
    .map((r) => ({
      date: parseDate(r.date)!,
      totalRevenue: Number(r.totalRevenue) || 0,
      operatingIncome: Number(r.operatingIncome) || 0,
      netIncome: Number(r.netIncome) || 0,
      ebitda: Number(r.EBITDA) || Number(r.normalizedEBITDA) || 0,
    }));
}

async function fetchViaQuoteSummary(symbol: string): Promise<QuarterlyStatement[]> {
  const result = await yahooFinance.quoteSummary(
    symbol,
    { modules: ['incomeStatementHistoryQuarterly'] },
    { validateResult: false }
  );

  const raw = result as Record<string, unknown>;
  const history = (raw?.incomeStatementHistoryQuarterly as Record<string, unknown>)
    ?.incomeStatementHistory as Array<Record<string, unknown>> | undefined;

  if (!history || history.length === 0) return [];

  return history
    .filter((s) => parseDate(s.endDate) !== null && Number(s.totalRevenue) > 0)
    .map((s) => ({
      date: parseDate(s.endDate)!,
      totalRevenue: Number(s.totalRevenue) || 0,
      operatingIncome: Number(s.operatingIncome) || 0,
      netIncome: Number(s.netIncome) || 0,
      ebitda: Number(s.ebitda) || 0,
    }));
}

export async function fetchQuarterlyIncome(
  symbol: string
): Promise<YahooQuarterlyResult> {
  // Fetch both sources in parallel and merge for maximum coverage
  const [fromFundamentals, fromQuoteSummary] = await Promise.all([
    fetchViaFundamentals(symbol).catch(() => [] as QuarterlyStatement[]),
    fetchViaQuoteSummary(symbol).catch(() => [] as QuarterlyStatement[]),
  ]);

  // Build a map keyed by date string. Fundamentals data takes priority (has operatingIncome).
  // QuoteSummary fills in quarters that fundamentals doesn't have yet.
  const byDate = new Map<string, QuarterlyStatement>();

  for (const s of fromQuoteSummary) {
    byDate.set(s.date.toISOString().split('T')[0], s);
  }
  for (const s of fromFundamentals) {
    byDate.set(s.date.toISOString().split('T')[0], s);
  }

  const statements = Array.from(byDate.values());

  if (statements.length === 0) {
    throw new Error(`${symbol}에 대한 분기별 데이터가 없습니다.`);
  }

  return { symbol, statements };
}

// Fetch exchange rates to KRW for quarter-end dates
export async function fetchExchangeRates(
  currency: string,
  dates: string[]
): Promise<ExchangeRateMap> {
  const rateMap: ExchangeRateMap = new Map();

  if (currency === 'KRW') {
    for (const d of dates) rateMap.set(d, 1);
    return rateMap;
  }

  const pair = `${currency}KRW=X`;
  const sortedDates = [...dates].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // Fetch wider range to ensure coverage
  const period1 = new Date(firstDate);
  period1.setDate(period1.getDate() - 10);
  const period2 = new Date(lastDate);
  period2.setDate(period2.getDate() + 10);

  try {
    const result = await yahooFinance.chart(
      pair,
      {
        period1: period1.toISOString().split('T')[0],
        period2: period2.toISOString().split('T')[0],
        interval: '1d',
      },
      { validateResult: false }
    );

    const raw = result as { quotes?: Array<{ date?: unknown; close?: number }> };
    const quotes = raw.quotes || [];

    // Build a daily rate lookup
    const dailyRates = new Map<string, number>();
    for (const q of quotes) {
      const d = parseDate(q.date);
      if (d && q.close) {
        dailyRates.set(d.toISOString().split('T')[0], q.close);
      }
    }

    // For each target date, find the closest available rate
    for (const targetDate of dates) {
      if (dailyRates.has(targetDate)) {
        rateMap.set(targetDate, dailyRates.get(targetDate)!);
      } else {
        // Find closest earlier date
        const target = new Date(targetDate).getTime();
        let closestRate = 0;
        let closestDiff = Infinity;
        for (const [dStr, rate] of dailyRates) {
          const diff = Math.abs(new Date(dStr).getTime() - target);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestRate = rate;
          }
        }
        if (closestRate > 0) {
          rateMap.set(targetDate, closestRate);
        }
      }
    }
  } catch {
    // If forex fetch fails, leave rates empty
  }

  return rateMap;
}
