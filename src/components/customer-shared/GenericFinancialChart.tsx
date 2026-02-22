'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FinancialMetricKey, CurrencyMode, KRW_MAP, formatAxisValue,
  CustomerInfo, FinancialMetricDef, collectQuarters,
} from '@/lib/chart-utils';
import { formatCurrency } from '@/lib/format';

interface GenericFinancialChartProps {
  customerIds: string[];
  customers: Record<string, { segmentFinancials: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
  financialMetrics: FinancialMetricDef[];
  currencyNoteKrw: string;
  currencyNoteOriginal: string;
}

export default function GenericFinancialChart({
  customerIds, customers, customerInfo, financialMetrics,
  currencyNoteKrw, currencyNoteOriginal,
}: GenericFinancialChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarters = collectQuarters(
    customerIds,
    (id) => customers[id].segmentFinancials as { quarter: string }[],
  );

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number> = { quarter };
    customerIds.forEach((id) => {
      const q = customers[id].segmentFinancials.find(
        (f) => (f as { quarter: string }).quarter === quarter,
      ) as Record<string, unknown> | undefined;
      if (currencyMode === 'krw') {
        const krwKey = KRW_MAP[selectedMetric];
        point[id] = q ? (q[krwKey] as number) : 0;
      } else {
        point[id] = q ? (q[selectedMetric] as number) : 0;
      }
    });
    return point;
  });

  const metricLabel = financialMetrics.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">
          분기별 {metricLabel} 비교 (세그먼트)
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {financialMetrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key as FinancialMetricKey)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>
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
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">
          {currencyMode === 'krw' ? `※ ${currencyNoteKrw}` : `※ ${currencyNoteOriginal}`}
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => formatAxisValue(v, currencyMode)}
            />
            <Tooltip
              formatter={(value, name) => {
                const info = customerInfo[name as string];
                const currency = currencyMode === 'krw' ? 'KRW' : info?.currency || 'USD';
                return [formatCurrency(Number(value), currency), info?.nameKo || name];
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend
              formatter={(value: string) => customerInfo[value]?.nameKo || value}
            />
            {customerIds.map((id) => (
              <Bar
                key={id}
                dataKey={id}
                fill={customerInfo[id].color}
                radius={[2, 2, 0, 0]}
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
