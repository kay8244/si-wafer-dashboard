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
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('techNode')}
        >기술노드 믹스</h2>
        <div className="flex gap-1">
          {DRAM_CUSTOMER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: DRAM_CUSTOMERS[id].color } : {}}
            >
              {DRAM_CUSTOMERS[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ 생산 비트 기준 기술노드별 비중(%)</p>
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
            <Bar dataKey="node1a" stackId="a" fill={NODE_COLORS.node1a} />
            <Bar dataKey="node1b" stackId="a" fill={NODE_COLORS.node1b} />
            <Bar dataKey="node1g" stackId="a" fill={NODE_COLORS.node1g} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
