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
    <section className="mb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
          onClick={() => onSelectMetric?.('processNode')}
        >
          공정 노드 믹스
        </h2>
        <div className="flex gap-1">
          {FOUNDRY_CUSTOMER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: FOUNDRY_CUSTOMERS[id].color } : {}}
            >
              {FOUNDRY_CUSTOMERS[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="mb-3 text-xs text-slate-400">※ 매출 기준 공정 노드별 비중(%)</p>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={quarters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}%`, NODE_LABELS[name ?? ''] || name || '']}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend formatter={(value: string) => NODE_LABELS[value] || value} />
            <Bar dataKey="legacy" stackId="a" fill={NODE_COLORS.legacy} />
            <Bar dataKey="node7nm" stackId="a" fill={NODE_COLORS.node7nm} />
            <Bar dataKey="node5nm" stackId="a" fill={NODE_COLORS.node5nm} />
            <Bar dataKey="node3nm" stackId="a" fill={NODE_COLORS.node3nm} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
