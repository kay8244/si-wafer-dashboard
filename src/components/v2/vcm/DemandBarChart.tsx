'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DataPoint {
  year: number;
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

export default function DemandBarChart({
  title,
  data,
  barColor = '#3b82f6',
}: DemandBarChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col h-full">
      <h3 className="font-semibold text-sm text-gray-800 mb-3">{title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value: number | undefined) => [
                value != null ? value.toLocaleString() : '-',
                'Value',
              ]}
              labelFormatter={(label) => `Year: ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
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
