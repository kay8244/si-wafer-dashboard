'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';

interface DramTechNodeChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

const NODE_COLORS = {
  node1g: '#10B981',
  node1b: '#3B82F6',
  node1a: '#F59E0B',
  legacy: '#9CA3AF',
};

const NODE_LABELS: Record<string, string> = {
  node1g: '1gnm',
  node1b: '1bnm',
  node1a: '1anm',
  legacy: 'Legacy',
};

export default function DramTechNodeChart({ customers, onSelectMetric }: DramTechNodeChartProps) {
  const [selectedCompany, setSelectedCompany] = useState<DramCustomerId>('samsungDS');

  const metrics = customers[selectedCompany].dramMetrics;
  const quarters = metrics
    .filter((m) => m.techNode)
    .slice(-8)
    .map((m) => ({
      quarter: m.quarter,
      node1g: m.techNode?.node1g ?? 0,
      node1b: m.techNode?.node1b ?? 0,
      node1a: m.techNode?.node1a ?? 0,
      legacy: m.techNode?.legacy ?? 0,
    }));

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('techNode')}
        >
          기술노드 믹스
        </h2>
        <div className="flex gap-1">
          {DRAM_CUSTOMER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: DRAM_CUSTOMERS[id].color } : {}}
            >
              {DRAM_CUSTOMERS[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={quarters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}%`, NODE_LABELS[name ?? ''] || name || '']}
              contentStyle={{ fontSize: 12, borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend formatter={(value: string) => NODE_LABELS[value] || value} />
            <Bar dataKey="legacy" stackId="a" fill={NODE_COLORS.legacy} />
            <Bar dataKey="node1a" stackId="a" fill={NODE_COLORS.node1a} />
            <Bar dataKey="node1b" stackId="a" fill={NODE_COLORS.node1b} />
            <Bar dataKey="node1g" stackId="a" fill={NODE_COLORS.node1g} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">※ 생산 비트 기준 기술노드별 비중(%)</p>
      </div>
    </section>
  );
}
