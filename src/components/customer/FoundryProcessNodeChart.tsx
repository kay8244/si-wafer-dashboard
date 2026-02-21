'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FoundryMetricKey } from '@/lib/foundry-constants';

interface FoundryProcessNodeChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  onSelectMetric?: (key: FoundryMetricKey) => void;
}

const NODE_COLORS = {
  legacy: '#94A3B8',
  node7nm: '#3B82F6',
  node5nm: '#8B5CF6',
  node3nm: '#EC4899',
};

const NODE_LABELS: Record<string, string> = {
  legacy: '레거시(10nm+)',
  node7nm: '7nm',
  node5nm: '5nm',
  node3nm: '3nm이하',
};

export default function FoundryProcessNodeChart({ customers, onSelectMetric }: FoundryProcessNodeChartProps) {
  const [selectedCompany, setSelectedCompany] = useState<FoundryCustomerId>('tsmc');

  const metrics = customers[selectedCompany].foundryMetrics;
  const quarters = metrics
    .filter((m) => m.processNode)
    .slice(-8)
    .map((m) => ({
      quarter: m.quarter,
      legacy: m.processNode?.legacy ?? 0,
      node7nm: m.processNode?.node7nm ?? 0,
      node5nm: m.processNode?.node5nm ?? 0,
      node3nm: m.processNode?.node3nm ?? 0,
    }));

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('processNode')}
        >공정 노드 믹스</h2>
        <div className="flex gap-1">
          {FOUNDRY_CUSTOMER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: FOUNDRY_CUSTOMERS[id].color } : {}}
            >
              {FOUNDRY_CUSTOMERS[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ 매출 기준 공정 노드별 비중(%)</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={quarters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}%`, NODE_LABELS[name ?? ''] || name || '']}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend formatter={(value: string) => NODE_LABELS[value] || value} />
            <Bar dataKey="legacy" stackId="a" fill={NODE_COLORS.legacy} />
            <Bar dataKey="node7nm" stackId="a" fill={NODE_COLORS.node7nm} />
            <Bar dataKey="node5nm" stackId="a" fill={NODE_COLORS.node5nm} />
            <Bar dataKey="node3nm" stackId="a" fill={NODE_COLORS.node3nm} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
