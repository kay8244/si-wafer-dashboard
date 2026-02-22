'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CustomerInfo } from '@/lib/chart-utils';

export interface StackedCategory {
  key: string;
  label: string;
  color: string;
}

interface GenericStackedMixChartProps {
  title: string;
  footnote: string;
  customerIds: string[];
  customers: Record<string, { metrics: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
  nestedField: string;
  categories: StackedCategory[];
  defaultCustomerId: string;
  onSelectMetric?: (key: string) => void;
  selectKey?: string;
}

export default function GenericStackedMixChart({
  title, footnote, customerIds, customers, customerInfo,
  nestedField, categories, defaultCustomerId,
  onSelectMetric, selectKey,
}: GenericStackedMixChartProps) {
  const [selectedCompany, setSelectedCompany] = useState(defaultCustomerId);

  const metrics = customers[selectedCompany].metrics as Record<string, unknown>[];
  const chartData = metrics
    .filter((m) => m[nestedField])
    .slice(-8)
    .map((m) => {
      const nested = m[nestedField] as Record<string, number | null>;
      const point: Record<string, string | number> = { quarter: m.quarter as string };
      categories.forEach((cat) => {
        point[cat.key] = nested[cat.key] ?? 0;
      });
      return point;
    });

  const categoryLabels: Record<string, string> = {};
  categories.forEach((c) => { categoryLabels[c.key] = c.label; });

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => selectKey && onSelectMetric?.(selectKey)}
        >{title}</h2>
        <div className="flex gap-1">
          {customerIds.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: customerInfo[id].color } : {}}
            >
              {customerInfo[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ {footnote}</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                `${value ?? 0}%`,
                categoryLabels[name ?? ''] || name || '',
              ]}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend formatter={(value: string) => categoryLabels[value] || value} />
            {categories.map((cat, idx) => (
              <Bar
                key={cat.key}
                dataKey={cat.key}
                stackId="a"
                fill={cat.color}
                radius={idx === categories.length - 1 ? [2, 2, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
