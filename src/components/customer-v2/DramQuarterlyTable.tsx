'use client';

import { useState } from 'react';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import { formatCurrency, formatExchangeRate } from '@/lib/format';

interface DramQuarterlyTableProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

type CurrencyMode = 'original' | 'krw';
type MetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';

const KRW_MAP: Record<MetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

export default function DramQuarterlyTable({ customers }: DramQuarterlyTableProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('revenue');

  const quarterSet = new Set<string>();
  DRAM_CUSTOMER_IDS.forEach((id) => {
    customers[id].segmentFinancials.forEach((q) => quarterSet.add(q.quarter));
  });
  const quarters = Array.from(quarterSet).sort().reverse().slice(0, 8);

  const metricLabel = DRAM_FINANCIAL_METRICS.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">분기별 상세 데이터</h2>
        <div className="flex items-center gap-2">
          {/* Metric selector */}
          <div className="flex gap-1">
            {DRAM_FINANCIAL_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key as MetricKey)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>
          {/* Currency toggle */}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setCurrencyMode('krw')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currencyMode === 'krw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              원화
            </button>
            <button
              onClick={() => setCurrencyMode('original')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currencyMode === 'original'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              현지통화
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                분기
              </th>
              {DRAM_CUSTOMER_IDS.map((id) => (
                <th
                  key={id}
                  className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide"
                  style={{ color: DRAM_CUSTOMERS[id].color }}
                >
                  {DRAM_CUSTOMERS[id].nameKo}
                  <span className="ml-1 font-normal text-slate-400 normal-case">
                    ({currencyMode === 'krw' ? 'KRW' : DRAM_CUSTOMERS[id].currency})
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-2 text-left text-xs text-slate-400 font-normal">
                {metricLabel}
              </th>
              {DRAM_CUSTOMER_IDS.map((id) => (
                <th key={id} className="px-6 py-2 text-right text-xs text-slate-400 font-normal">
                  —
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, idx) => (
              <tr
                key={quarter}
                className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                  {quarter}
                </td>
                {DRAM_CUSTOMER_IDS.map((id) => {
                  const q = customers[id].segmentFinancials.find((item) => item.quarter === quarter);
                  const currency = currencyMode === 'krw' ? 'KRW' : DRAM_CUSTOMERS[id].currency;
                  const krwKey = KRW_MAP[selectedMetric];
                  const value = q
                    ? currencyMode === 'krw'
                      ? (q[krwKey as keyof typeof q] as number)
                      : (q[selectedMetric as keyof typeof q] as number)
                    : null;

                  return (
                    <td key={id} className="px-6 py-4 text-right tabular-nums text-slate-700">
                      {value != null ? formatCurrency(value, currency) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currencyMode === 'krw' && (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
          <span>적용 환율:</span>
          {DRAM_CUSTOMER_IDS.map((id) => {
            const latest = customers[id].segmentFinancials[customers[id].segmentFinancials.length - 1];
            if (!latest || DRAM_CUSTOMERS[id].currency === 'KRW') return null;
            return (
              <span key={id}>
                {DRAM_CUSTOMERS[id].nameKo}: {formatExchangeRate(latest.exchangeRate, DRAM_CUSTOMERS[id].currency)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
