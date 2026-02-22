'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { FinancialMetricKey, calcYoYGrowth, CustomerInfo, FinancialMetricDef } from '@/lib/chart-utils';
import { formatPercent } from '@/lib/format';

interface GenericTrendChartProps {
  customerIds: string[];
  customers: Record<string, { segmentFinancials: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
  financialMetrics: FinancialMetricDef[];
}

export default function GenericTrendChart({
  customerIds, customers, customerInfo, financialMetrics,
}: GenericTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');

  const growthMaps: Record<string, Map<string, number | null>> = {};
  customerIds.forEach((id) => {
    growthMaps[id] = calcYoYGrowth(
      customers[id].segmentFinancials as unknown as Parameters<typeof calcYoYGrowth>[0],
      selectedMetric,
    );
  });

  const quarterSet = new Set<string>();
  customerIds.forEach((id) => {
    growthMaps[id].forEach((_, quarter) => quarterSet.add(quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number | null> = { quarter };
    customerIds.forEach((id) => {
      point[id] = growthMaps[id].get(quarter) ?? null;
    });
    return point;
  });

  const metricLabel = financialMetrics.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">
          {metricLabel} YoY 성장률 추이
        </h2>
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
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">
          ※ 전년 동기 대비 성장률(%) — 통화 무관 비교 가능
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => {
                const info = customerInfo[(name ?? '') as string];
                return [formatPercent(value as number | null), info?.nameKo || name || ''];
              }}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend
              formatter={(value: string) => customerInfo[value]?.nameKo || value}
            />
            <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
            {customerIds.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={customerInfo[id].color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
