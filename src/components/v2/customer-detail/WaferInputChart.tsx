'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { WaferInputData, WaferInputUnit } from '@/types/v2';

interface Props {
  data: WaferInputData[];
}

const UNITS: { id: WaferInputUnit; label: string }[] = [
  { id: 'km2', label: 'Km²' },
  { id: 'km', label: 'Km' },
  { id: 'kpcs', label: 'Kpcs' },
];

export default function WaferInputChart({ data }: Props) {
  const [unit, setUnit] = useState<WaferInputUnit>('km2');

  const chartData = data.map((d) => ({
    quarter: d.quarter,
    value: d[unit],
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Wafer 투입량 변동 Chart</h3>
        <div className="flex gap-1">
          {UNITS.map((u) => (
            <button
              key={u.id}
              onClick={() => setUnit(u.id)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                unit === u.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3 }}
            name={UNITS.find((u) => u.id === unit)?.label}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
