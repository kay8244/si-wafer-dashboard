'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DeviceStackedEntry } from '@/types/v2';
import { useDarkMode } from '@/hooks/useDarkMode';

interface DeviceStackedChartProps {
  title: string;
  data: DeviceStackedEntry[];
}

const DEVICE_COLORS: Record<string, string> = {
  dram: '#3b82f6',
  hbm: '#8b5cf6',
  nand: '#10b981',
  foundry: '#f59e0b',
  discrete: '#ef4444',
};

const DEVICE_LABELS: Record<string, string> = {
  dram: 'DRAM',
  hbm: 'HBM',
  nand: 'NAND',
  foundry: 'Foundry',
  discrete: 'Discrete',
};

function formatYAxis(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default function DeviceStackedChart({ title, data }: DeviceStackedChartProps) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };
  const deviceKeys = ['dram', 'hbm', 'nand', 'foundry', 'discrete'] as const;

  // Filter out device types that are all zeros
  const activeKeys = deviceKeys.filter((key) =>
    data.some((entry) => entry[key] > 0),
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      <h3 className="mb-3 text-lg font-bold text-gray-800">{title}</h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 13, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 13, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value: unknown, name?: string) => [
                `${Number(value).toLocaleString()} Kwsm`,
                DEVICE_LABELS[name ?? ''] ?? name,
              ]}
              contentStyle={tooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: 14 }}
              formatter={(value: string) => DEVICE_LABELS[value] ?? value}
            />
            {activeKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="devices"
                fill={DEVICE_COLORS[key]}
                radius={key === activeKeys[activeKeys.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
