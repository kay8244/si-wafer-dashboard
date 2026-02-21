'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { QuarterlyFinancial } from '@/types/company';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import { formatPercent } from '@/lib/format';

interface DramTrendChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';

function calcYoYGrowth(
  financials: QuarterlyFinancial[],
  metric: FinancialMetricKey
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  financials.forEach((q) => {
    const prevYear = financials.find(
      (pq) => pq.period === q.period && pq.calendarYear === String(Number(q.calendarYear) - 1)
    );
    if (prevYear && (prevYear[metric] as number) !== 0) {
      const growth = (((q[metric] as number) - (prevYear[metric] as number)) / Math.abs(prevYear[metric] as number)) * 100;
      map.set(q.quarter, growth);
    } else {
      map.set(q.quarter, null);
    }
  });
  return map;
}

export default function DramTrendChart({ customers }: DramTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');

  const growthMaps: Record<string, Map<string, number | null>> = {};
  DRAM_CUSTOMER_IDS.forEach((id) => {
    growthMaps[id] = calcYoYGrowth(customers[id].segmentFinancials, selectedMetric);
  });

  const quarterSet = new Set<string>();
  DRAM_CUSTOMER_IDS.forEach((id) => {
    growthMaps[id].forEach((_, quarter) => quarterSet.add(quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number | null> = { quarter };
    DRAM_CUSTOMER_IDS.forEach((id) => {
      point[id] = growthMaps[id].get(quarter) ?? null;
    });
    return point;
  });

  const metricLabel = DRAM_FINANCIAL_METRICS.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">
          {metricLabel} YoY 성장률 추이
        </h2>
        <div className="flex gap-1">
          {DRAM_FINANCIAL_METRICS.map((m) => (
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
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => {
                const customer = DRAM_CUSTOMERS[name as DramCustomerId];
                return [formatPercent(value as number | null), customer?.nameKo || name];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) => {
                const customer = DRAM_CUSTOMERS[value as DramCustomerId];
                return customer?.nameKo || value;
              }}
            />
            <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
            {DRAM_CUSTOMER_IDS.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={DRAM_CUSTOMERS[id].color}
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
