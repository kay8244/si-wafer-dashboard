'use client';

import { useState } from 'react';
import { CurrencyMode, CustomerInfo } from '@/lib/chart-utils';
import { formatCurrency, formatExchangeRate } from '@/lib/format';

interface GenericQuarterlyTableProps {
  customerIds: string[];
  customers: Record<string, { segmentFinancials: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
}

export default function GenericQuarterlyTable({
  customerIds, customers, customerInfo,
}: GenericQuarterlyTableProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarterSet = new Set<string>();
  customerIds.forEach((id) => {
    customers[id].segmentFinancials.forEach((q) => quarterSet.add((q as { quarter: string }).quarter));
  });
  const quarters = Array.from(quarterSet).sort().reverse().slice(0, 8);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">분기별 상세 데이터</h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setCurrencyMode('krw')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'krw'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            원화(KRW)
          </button>
          <button
            onClick={() => setCurrencyMode('original')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'original'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            현지통화
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">분기</th>
              {customerIds.map((id) => (
                <th
                  key={id}
                  className="px-4 py-3 text-right font-semibold"
                  style={{ color: customerInfo[id].color }}
                  colSpan={4}
                >
                  {customerInfo[id].nameKo}
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    ({currencyMode === 'krw' ? 'KRW' : customerInfo[id].currency})
                  </span>
                </th>
              ))}
            </tr>
            <tr className="border-b bg-gray-50/50">
              <th className="px-4 py-2" />
              {customerIds.map((id) => (
                <th key={id} colSpan={4} className="px-0 py-0">
                  <div className="flex">
                    <span className="flex-1 px-2 py-2 text-right text-xs font-medium text-gray-500">매출</span>
                    <span className="flex-1 px-2 py-2 text-right text-xs font-medium text-gray-500">영업이익</span>
                    <span className="flex-1 px-2 py-2 text-right text-xs font-medium text-gray-500">순이익</span>
                    <span className="flex-1 px-2 py-2 text-right text-xs font-medium text-gray-500">EBITDA</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, idx) => (
              <tr key={quarter} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">{quarter}</td>
                {customerIds.map((id) => {
                  const q = customers[id].segmentFinancials.find(
                    (item) => (item as { quarter: string }).quarter === quarter,
                  ) as Record<string, unknown> | undefined;
                  const currency = currencyMode === 'krw' ? 'KRW' : customerInfo[id].currency;
                  const rev = currencyMode === 'krw' ? q?.revenueKRW : q?.revenue;
                  const oi = currencyMode === 'krw' ? q?.operatingIncomeKRW : q?.operatingIncome;
                  const ni = currencyMode === 'krw' ? q?.netIncomeKRW : q?.netIncome;
                  const ebitda = currencyMode === 'krw' ? q?.ebitdaKRW : q?.ebitda;

                  return (
                    <td key={id} colSpan={4} className="px-0 py-0">
                      <div className="flex">
                        <span className="flex-1 px-2 py-3 text-right text-xs text-gray-700">
                          {q ? formatCurrency(rev as number, currency) : '-'}
                        </span>
                        <span className="flex-1 px-2 py-3 text-right text-xs text-gray-700">
                          {q ? formatCurrency(oi as number, currency) : '-'}
                        </span>
                        <span className="flex-1 px-2 py-3 text-right text-xs text-gray-700">
                          {q ? formatCurrency(ni as number, currency) : '-'}
                        </span>
                        <span className="flex-1 px-2 py-3 text-right text-xs text-gray-700">
                          {q ? formatCurrency(ebitda as number, currency) : '-'}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currencyMode === 'krw' && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>적용 환율:</span>
          {customerIds.map((id) => {
            const financials = customers[id].segmentFinancials;
            const latest = financials[financials.length - 1] as Record<string, unknown> | undefined;
            if (!latest || customerInfo[id].currency === 'KRW') return null;
            return (
              <span key={id}>
                {customerInfo[id].nameKo}: {formatExchangeRate(latest.exchangeRate as number, customerInfo[id].currency)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
