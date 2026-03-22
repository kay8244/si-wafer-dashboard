'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CustomerExecutive, IndustryMetric } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Props {
  metrics: CustomerExecutive['industryMetrics'];
  customerType: 'memory' | 'foundry';
}

function formatValue(value: number, unit: string): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === '$M') return `$${value.toLocaleString()}M`;
  if (unit === 'M units') return `${value.toLocaleString()}M`;
  return `${value.toLocaleString()} ${unit}`;
}

function MetricCard({ metric, wide, isDark }: { metric: IndustryMetric; wide: boolean; isDark: boolean }) {
  const data = metric.data;
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const change = prev ? latest.value - prev.value : null;
  const changePct = prev && prev.value !== 0 ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100 : null;

  const lineColor = isDark ? '#60a5fa' : '#3b82f6';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e5e7eb';
  const tooltipText = isDark ? '#e2e8f0' : '#1f2937';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800 ${wide ? 'col-span-2' : ''}`}
    >
      {/* Header: name + tooltip icon */}
      <div className="mb-1 flex items-center gap-1">
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
          {metric.name}
        </span>
        {metric.tooltip && (
          <span
            className="cursor-help text-[10px] text-gray-400 dark:text-gray-500"
            title={metric.tooltip}
          >
            ⓘ
          </span>
        )}
      </div>

      {/* Latest value + change */}
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
          {formatValue(latest.value, metric.unit)}
        </span>
        {changePct !== null && (
          <span
            className={`text-[10px] font-medium ${
              change! >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'
            }`}
          >
            {change! >= 0 ? '+' : ''}{changePct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Mini chart */}
      <div style={{ height: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 4,
                fontSize: 10,
                color: tooltipText,
                padding: '2px 6px',
              }}
              formatter={(value: number | undefined) => [value !== undefined ? formatValue(value, metric.unit) : '-', metric.name]}
              labelFormatter={(label) => String(label ?? '')}
              cursor={{ stroke: isDark ? '#475569' : '#d1d5db', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function IndustryMetricsPanel({ metrics, customerType }: Props) {
  const { isDark } = useDarkMode();

  if (!metrics || metrics.length === 0) return null;

  const isMemory = customerType === 'memory';

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-gray-800 dark:text-gray-200">산업 지표</h3>
      <div className={`grid gap-2 ${isMemory ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            wide={isMemory}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}
