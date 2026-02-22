'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';

interface DataPoint {
  quarter: string;
  value: number;
  isEstimate: boolean;
}

interface DemandBarChartProps {
  title: string;
  data: DataPoint[];
  barColor?: string;
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatBarLabel(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export default function DemandBarChart({
  title,
  data,
  barColor = '#3b82f6',
}: DemandBarChartProps) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const labelFill = isDark ? '#cbd5e1' : '#374151';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };
  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value: number | undefined) => [
                value != null ? value.toLocaleString() : '-',
                'Value',
              ]}
              labelFormatter={(label) => label}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: unknown) => formatBarLabel(Number(v))}
                style={{ fontSize: 11, fill: labelFill, fontWeight: 600 }}
              />
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColor}
                  opacity={entry.isEstimate ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
