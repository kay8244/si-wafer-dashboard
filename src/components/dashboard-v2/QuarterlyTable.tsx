'use client';

import { useState } from 'react';
import { CompanyFinancialData, CompanyId } from '@/types/company';
import { MetricKey } from '@/types/dashboard';
import { COMPANIES, COMPANY_IDS, METRIC_LABELS } from '@/lib/constants';
import { formatCurrency, formatCurrencyOrNA, formatPercent } from '@/lib/format';

interface QuarterlyTableProps {
  companies: Record<CompanyId, CompanyFinancialData>;
  metric: MetricKey;
}

type CurrencyMode = 'original' | 'krw';

const KRW_METRIC_MAP: Record<MetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

const NA_METRICS: MetricKey[] = ['operatingIncome', 'ebitda'];

function getMetricValue(
  q: CompanyFinancialData['quarterlies'][number] | undefined,
  metric: MetricKey,
  mode: CurrencyMode
): number | undefined {
  if (!q) return undefined;
  if (mode === 'krw') {
    const krwField = KRW_METRIC_MAP[metric] as keyof typeof q;
    return q[krwField] as number;
  }
  return q[metric];
}

function calcYoY(
  quarterlies: CompanyFinancialData['quarterlies'],
  quarter: string,
  metric: MetricKey,
  mode: CurrencyMode
): number | null {
  const current = quarterlies.find((q) => q.quarter === quarter);
  if (!current) return null;

  const prevYear = quarterlies.find(
    (q) => q.period === current.period && q.calendarYear === String(Number(current.calendarYear) - 1)
  );
  if (!prevYear) return null;

  const currentVal = getMetricValue(current, metric, mode);
  const prevVal = getMetricValue(prevYear, metric, mode);

  if (currentVal === undefined || prevVal === undefined || prevVal === 0) return null;
  return ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
}

export default function QuarterlyTable({ companies, metric }: QuarterlyTableProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarterSet = new Set<string>();
  COMPANY_IDS.forEach((id) => {
    companies[id].quarterlies.forEach((q) => quarterSet.add(q.quarter));
  });
  const quarters = Array.from(quarterSet).sort().reverse().slice(0, 8);

  const isNAMetric = NA_METRICS.includes(metric);

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          분기별 {METRIC_LABELS[metric]} 상세
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrencyMode('krw')}
            className={`pb-1 text-sm transition-colors ${
              currencyMode === 'krw'
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            원화(KRW)
          </button>
          <button
            onClick={() => setCurrencyMode('original')}
            className={`pb-1 text-sm transition-colors ${
              currencyMode === 'original'
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            현지통화
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-5 py-4 text-left text-sm font-medium text-slate-600">
                  분기
                </th>
                {COMPANY_IDS.map((id) => (
                  <th
                    key={id}
                    className="px-5 py-4 text-right text-sm font-medium"
                    style={{ color: COMPANIES[id].color }}
                  >
                    {COMPANIES[id].nameKo}
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      ({currencyMode === 'krw' ? 'KRW' : COMPANIES[id].currency})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quarters.map((quarter, idx) => (
                <tr
                  key={quarter}
                  className={`border-b last:border-b-0 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                    {quarter}
                  </td>
                  {COMPANY_IDS.map((id) => {
                    const q = companies[id].quarterlies.find(
                      (item) => item.quarter === quarter
                    );
                    const currency = currencyMode === 'krw' ? 'KRW' : COMPANIES[id].currency;
                    const value = getMetricValue(q, metric, currencyMode);
                    const yoy = calcYoY(companies[id].quarterlies, quarter, metric, currencyMode);

                    const formatted = q === undefined
                      ? '-'
                      : value === undefined
                        ? '-'
                        : isNAMetric
                          ? formatCurrencyOrNA(value, currency)
                          : formatCurrency(value, currency);

                    const yoyPositive = yoy !== null && yoy > 0;
                    const yoyNegative = yoy !== null && yoy < 0;

                    return (
                      <td key={id} className="px-5 py-4 text-right tabular-nums">
                        <span className="block text-sm text-slate-800">{formatted}</span>
                        {yoy !== null && (
                          <span
                            className={`text-xs ${
                              yoyPositive
                                ? 'text-emerald-600'
                                : yoyNegative
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                            }`}
                          >
                            {yoyPositive ? '▲' : yoyNegative ? '▼' : ''}{' '}
                            {formatPercent(yoy)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
