'use client';

import { useState, useMemo } from 'react';

interface FinancialEntry {
  quarter: string;
  revenue: number;
  operatingIncome: number;
}

interface Props {
  financials: FinancialEntry[];
  customerId?: string;
  customerLabel?: string;
}

/** Short display name per customer */
const SHORT_NAME: Record<string, string> = {
  SEC: 'SEC',
  SKHynix: 'SKHY',
  Micron: 'Micron',
  Koxia: 'Kioxia',
  SEC_Foundry: 'SEC - 파운드리',
  TSMC: 'TSMC',
  SMC: 'SMIC',
  GFS: 'GFs',
  STM: 'STM',
  Intel: 'Intel',
};

/** Local currency symbol (without M — unit shown separately) */
const CURRENCY_MAP: Record<string, string> = {
  SEC: '₩',
  SKHynix: '₩',
  Total_DRAM_NAND: '$',
  SEC_Foundry: '₩',
  Total_Foundry: '$',
  Micron: '$',
  GFS: '$',
  Intel: '$',
  Koxia: '¥',
  TSMC: 'NT$',
  SMC: 'CN¥',
  STM: '€',
};

type TimeRange = 4 | 8 | 12;
type Granularity = 'quarterly' | 'yearly';

/** Parse quarter string like "4Q21" or "1Q25" into { q: 1-4, year: 2021-2099 } */
function parseQuarter(qStr: string): { q: number; year: number } | null {
  const m = qStr.match(/^(\d)Q(\d{2})$/);
  if (!m) return null;
  return { q: parseInt(m[1]), year: 2000 + parseInt(m[2]) };
}

/** Get the latest completed quarter based on current date */
function getLatestCompletedQuarter(): { q: number; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
  // Current month's quarter is not yet completed, so go back one
  let q: number;
  if (month <= 3) q = 4;
  else if (month <= 6) q = 1;
  else if (month <= 9) q = 2;
  else q = 3;
  const y = q === 4 ? year - 1 : year;
  return { q, year: y };
}

function quarterToSortKey(q: number, year: number): number {
  return year * 10 + q;
}

function calcQoQ(current: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

function calcYoY(current: number, prevYear: number | undefined): number | null {
  if (prevYear === undefined || prevYear === 0) return null;
  return ((current - prevYear) / Math.abs(prevYear)) * 100;
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtPct(val: number | null): string {
  if (val === null) return '-';
  const sign = val >= 0 ? '+' : '-';
  return `${sign}${Math.abs(val).toFixed(0)}%`;
}

function pctClass(val: number | null): string {
  if (val === null) return 'text-gray-400 dark:text-gray-500';
  if (val > 0) return 'text-blue-600 dark:text-blue-400';
  if (val < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

export default function FinancialResultsTable({ financials, customerId, customerLabel }: Props) {
  const currency = CURRENCY_MAP[customerId ?? ''] ?? '$M';
  const [timeRange, setTimeRange] = useState<TimeRange>(4);
  const [granularity, setGranularity] = useState<Granularity>('quarterly');

  // Parse, sort, and filter financials to show only past quarters
  const sortedAll = useMemo(() => {
    const parsed = financials
      .map((f) => ({ ...f, parsed: parseQuarter(f.quarter) }))
      .filter((f) => f.parsed !== null)
      .sort((a, b) => quarterToSortKey(a.parsed!.q, a.parsed!.year) - quarterToSortKey(b.parsed!.q, b.parsed!.year));

    const latest = getLatestCompletedQuarter();
    const latestKey = quarterToSortKey(latest.q, latest.year);

    return parsed.filter((f) => quarterToSortKey(f.parsed!.q, f.parsed!.year) <= latestKey);
  }, [financials]);

  // Apply granularity and time range
  const displayData = useMemo(() => {
    if (granularity === 'quarterly') {
      // Take last N quarters
      const sliced = sortedAll.slice(-timeRange);
      return sliced.map((f) => ({
        label: f.quarter,
        revenue: f.revenue,
        operatingIncome: f.operatingIncome,
      }));
    } else {
      // Yearly: aggregate by year, then take last N years
      const yearMap = new Map<number, { revenue: number; operatingIncome: number; count: number }>();
      for (const f of sortedAll) {
        const y = f.parsed!.year;
        if (!yearMap.has(y)) yearMap.set(y, { revenue: 0, operatingIncome: 0, count: 0 });
        const entry = yearMap.get(y)!;
        entry.revenue += f.revenue;
        entry.operatingIncome += f.operatingIncome;
        entry.count++;
      }
      const years = Array.from(yearMap.entries())
        .sort(([a], [b]) => a - b)
        .slice(-(timeRange === 4 ? 4 : timeRange === 8 ? 6 : 8))
        .map(([year, data]) => ({
          label: `${year}`,
          revenue: data.revenue,
          operatingIncome: data.operatingIncome,
        }));
      return years;
    }
  }, [sortedAll, timeRange, granularity]);

  if (!financials || financials.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Title — large like ExecutivePanel */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          재무실적
          {customerId && SHORT_NAME[customerId] && (
            <span className="ml-1.5 text-[11px] font-normal text-gray-400 dark:text-gray-500">({SHORT_NAME[customerId]})</span>
          )}
        </h3>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">(단위 : M)</span>
        </div>
        {/* Controls row below title */}
        <div className="mt-2 flex items-center gap-2">
          {/* Granularity toggle */}
          <div className="flex overflow-hidden rounded border border-gray-200 dark:border-gray-600">
            {(['quarterly', 'yearly'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  granularity === g
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {g === 'quarterly' ? '분기별' : '년도별'}
              </button>
            ))}
          </div>
          {/* Time range */}
          <div className="flex overflow-hidden rounded border border-gray-200 dark:border-gray-600">
            {([4, 8, 12] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  timeRange === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {r}Q
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                구분
              </th>
              {displayData.map((f) => (
                <th
                  key={f.label}
                  className="px-3 py-1.5 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue row */}
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
              <td className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap dark:bg-gray-800/40 dark:text-gray-300">
                매출 ({currency})
              </td>
              {displayData.map((f) => (
                <td key={f.label} className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">
                  {fmtNum(f.revenue)}
                </td>
              ))}
            </tr>
            {/* Revenue QoQ/YoY */}
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="sticky left-0 z-10 bg-white px-3 py-1 pl-6 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                {granularity === 'quarterly' ? 'QoQ' : 'YoY'}
              </td>
              {displayData.map((f, i) => {
                const val = granularity === 'quarterly'
                  ? calcQoQ(f.revenue, displayData[i - 1]?.revenue)
                  : calcYoY(f.revenue, displayData[i - 1]?.revenue);
                return (
                  <td key={f.label} className={`px-3 py-1 text-right ${pctClass(val)}`}>
                    {fmtPct(val)}
                  </td>
                );
              })}
            </tr>
            {/* Operating Income row */}
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40">
              <td className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap dark:bg-gray-800/40 dark:text-gray-300">
                영업이익 ({currency})
              </td>
              {displayData.map((f) => (
                <td key={f.label} className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">
                  {fmtNum(f.operatingIncome)}
                </td>
              ))}
            </tr>
            {/* Operating Income QoQ/YoY */}
            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-1 pl-6 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                {granularity === 'quarterly' ? 'QoQ' : 'YoY'}
              </td>
              {displayData.map((f, i) => {
                const val = granularity === 'quarterly'
                  ? calcQoQ(f.operatingIncome, displayData[i - 1]?.operatingIncome)
                  : calcYoY(f.operatingIncome, displayData[i - 1]?.operatingIncome);
                return (
                  <td key={f.label} className={`px-3 py-1 text-right ${pctClass(val)}`}>
                    {fmtPct(val)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
