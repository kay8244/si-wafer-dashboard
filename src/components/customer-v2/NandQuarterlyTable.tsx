'use client';

import { useState } from 'react';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NAND_FINANCIAL_METRICS } from '@/lib/nand-constants';
import { formatCurrency, formatExchangeRate } from '@/lib/format';

interface NandQuarterlyTableProps {
  customers: Record<NandCustomerId, NandCustomerData>;
}

type CurrencyMode = 'original' | 'krw';

type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';

const KRW_MAP: Record<FinancialMetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

export default function NandQuarterlyTable({ customers }: NandQuarterlyTableProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');

  const quarterSet = new Set<string>();
  NAND_CUSTOMER_IDS.forEach((id) => {
    customers[id].segmentFinancials.forEach((q) => quarterSet.add(q.quarter));
  });
  const quarters = Array.from(quarterSet).sort().reverse().slice(0, 8);

  const metricLabel =
    NAND_FINANCIAL_METRICS.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">분기별 상세 데이터</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {NAND_FINANCIAL_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key as FinancialMetricKey)}
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
            <tr className="border-b bg-slate-50">
              <th className="px-6 py-4 text-left font-semibold text-slate-700">분기</th>
              {NAND_CUSTOMER_IDS.map((id) => (
                <th
                  key={id}
                  className="px-6 py-4 text-right font-semibold"
                  style={{ color: NAND_CUSTOMERS[id].color }}
                >
                  {NAND_CUSTOMERS[id].nameKo}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({currencyMode === 'krw' ? 'KRW' : NAND_CUSTOMERS[id].currency})
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b bg-slate-50/60">
              <td className="px-6 py-2 text-xs text-slate-400">{metricLabel}</td>
              {NAND_CUSTOMER_IDS.map((id) => (
                <td key={id} className="px-6 py-2 text-right text-xs text-slate-400">
                  {NAND_CUSTOMERS[id].nameKo}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, idx) => (
              <tr
                key={quarter}
                className={`border-b transition-colors hover:bg-slate-50 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                  {quarter}
                </td>
                {NAND_CUSTOMER_IDS.map((id) => {
                  const q = customers[id].segmentFinancials.find((item) => item.quarter === quarter);
                  const krwKey = KRW_MAP[selectedMetric] as keyof typeof q;
                  const value =
                    q
                      ? currencyMode === 'krw'
                        ? (q[krwKey] as number)
                        : (q[selectedMetric as keyof typeof q] as number)
                      : null;
                  const currency = currencyMode === 'krw' ? 'KRW' : NAND_CUSTOMERS[id].currency;

                  return (
                    <td key={id} className="px-6 py-4 text-right text-sm tabular-nums text-slate-700">
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
          {NAND_CUSTOMER_IDS.map((id) => {
            const latest =
              customers[id].segmentFinancials[customers[id].segmentFinancials.length - 1];
            if (!latest || NAND_CUSTOMERS[id].currency === 'KRW') return null;
            return (
              <span key={id}>
                {NAND_CUSTOMERS[id].nameKo}: {formatExchangeRate(latest.exchangeRate, NAND_CUSTOMERS[id].currency)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
