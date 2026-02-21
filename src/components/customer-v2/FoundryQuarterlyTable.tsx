'use client';

import { useState } from 'react';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FOUNDRY_FINANCIAL_METRICS } from '@/lib/foundry-constants';
import { formatCurrency, formatExchangeRate } from '@/lib/format';

interface FoundryQuarterlyTableProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
}

type CurrencyMode = 'original' | 'krw';
type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';

const KRW_MAP: Record<FinancialMetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

export default function FoundryQuarterlyTable({ customers }: FoundryQuarterlyTableProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');

  const quarterSet = new Set<string>();
  FOUNDRY_CUSTOMER_IDS.forEach((id) => {
    customers[id].segmentFinancials.forEach((q) => quarterSet.add(q.quarter));
  });
  const quarters = Array.from(quarterSet).sort().reverse().slice(0, 8);

  const metricLabel = FOUNDRY_FINANCIAL_METRICS.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">분기별 상세 데이터</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {FOUNDRY_FINANCIAL_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key as FinancialMetricKey)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setCurrencyMode('krw')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currencyMode === 'krw'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              원화(KRW)
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">분기</th>
              {FOUNDRY_CUSTOMER_IDS.map((id) => (
                <th
                  key={id}
                  className="px-6 py-4 text-right text-xs font-semibold"
                  style={{ color: FOUNDRY_CUSTOMERS[id].color }}
                >
                  {FOUNDRY_CUSTOMERS[id].nameKo}
                  <span className="ml-1 font-normal text-slate-400">
                    ({currencyMode === 'krw' ? 'KRW' : FOUNDRY_CUSTOMERS[id].currency})
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-2 text-left text-xs font-medium text-slate-400">{metricLabel}</th>
              {FOUNDRY_CUSTOMER_IDS.map((id) => (
                <th key={id} className="px-6 py-2 text-right text-xs font-medium text-slate-400">
                  {metricLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, idx) => (
              <tr
                key={quarter}
                className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">{quarter}</td>
                {FOUNDRY_CUSTOMER_IDS.map((id) => {
                  const q = customers[id].segmentFinancials.find((item) => item.quarter === quarter);
                  const currency = currencyMode === 'krw' ? 'KRW' : FOUNDRY_CUSTOMERS[id].currency;
                  const krwKey = KRW_MAP[selectedMetric];
                  const value = currencyMode === 'krw'
                    ? (q?.[krwKey as keyof typeof q] as number | undefined)
                    : (q?.[selectedMetric as keyof typeof q] as number | undefined);

                  return (
                    <td key={id} className="px-6 py-4 text-right text-sm tabular-nums text-slate-700">
                      {q && value != null ? formatCurrency(value, currency) : '-'}
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
          {FOUNDRY_CUSTOMER_IDS.map((id) => {
            const latest = customers[id].segmentFinancials[customers[id].segmentFinancials.length - 1];
            if (!latest || FOUNDRY_CUSTOMERS[id].currency === 'KRW') return null;
            return (
              <span key={id}>
                {FOUNDRY_CUSTOMERS[id].nameKo}: {formatExchangeRate(latest.exchangeRate, FOUNDRY_CUSTOMERS[id].currency)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
