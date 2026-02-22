'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CurrencyMode, formatAxisValue, CustomerInfo, collectQuarters } from '@/lib/chart-utils';
import { formatCurrency } from '@/lib/format';

interface GenericCapexChartProps {
  customerIds: string[];
  customers: Record<string, { metrics: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
  onSelectMetric?: (key: string) => void;
  selectKey?: string;
}

export default function GenericCapexChart({
  customerIds, customers, customerInfo, onSelectMetric, selectKey = 'capex',
}: GenericCapexChartProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarters = collectQuarters(
    customerIds,
    (id) => customers[id].metrics as { quarter: string }[],
  );

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number> = { quarter };
    customerIds.forEach((id) => {
      const m = (customers[id].metrics as Record<string, unknown>[]).find(
        (dm) => (dm as { quarter: string }).quarter === quarter,
      ) as Record<string, unknown> | undefined;
      if (currencyMode === 'krw') {
        point[id] = m ? (m.capexKRW as number) : 0;
      } else {
        point[id] = m ? (m.capex as number) : 0;
      }
    });
    return point;
  });

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.(selectKey)}
        >설비투자(Capex) 비교</h2>
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
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ 분기별 설비투자 금액</p>
        <ResponsiveContainer width="100%" height={350}>
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
