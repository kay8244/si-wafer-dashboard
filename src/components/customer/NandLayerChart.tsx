'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NandMetricKey } from '@/lib/nand-constants';

interface NandLayerChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  onSelectMetric?: (key: NandMetricKey) => void;
}

const LAYER_COLORS = {
  legacy: '#94A3B8',
  layer128: '#3B82F6',
  layer176: '#8B5CF6',
  layer232: '#EC4899',
};

const LAYER_LABELS: Record<string, string> = {
  legacy: '레거시',
  layer128: '128단',
  layer176: '176단',
  layer232: '232단+',
};

export default function NandLayerChart({ customers, onSelectMetric }: NandLayerChartProps) {
  const [selectedCompany, setSelectedCompany] = useState<NandCustomerId>('samsungNand');

  const metrics = customers[selectedCompany].nandMetrics;
  const quarters = metrics
    .filter((m) => m.layerStack)
    .slice(-8)
    .map((m) => ({
      quarter: m.quarter,
      layer232: m.layerStack?.layer232 ?? 0,
      layer176: m.layerStack?.layer176 ?? 0,
      layer128: m.layerStack?.layer128 ?? 0,
      legacy: m.layerStack?.legacy ?? 0,
    }));

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('layerStack')}
        >적층 기술 믹스</h2>
        <div className="flex gap-1">
          {NAND_CUSTOMER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedCompany(id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedCompany === id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={selectedCompany === id ? { backgroundColor: NAND_CUSTOMERS[id].color } : {}}
            >
              {NAND_CUSTOMERS[id].nameKo}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ 생산 비트 기준 적층 단수별 비중(%)</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={quarters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}%`, LAYER_LABELS[name ?? ''] || name || '']}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend formatter={(value: string) => LAYER_LABELS[value] || value} />
            <Bar dataKey="legacy" stackId="a" fill={LAYER_COLORS.legacy} />
            <Bar dataKey="layer128" stackId="a" fill={LAYER_COLORS.layer128} />
            <Bar dataKey="layer176" stackId="a" fill={LAYER_COLORS.layer176} />
            <Bar dataKey="layer232" stackId="a" fill={LAYER_COLORS.layer232} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
