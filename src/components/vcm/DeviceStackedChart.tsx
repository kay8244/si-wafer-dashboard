'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from 'recharts';
import type { DeviceStackedYearlyEntry, DeviceFilterItem } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
const START_YEAR = 2024;
const END_YEAR = 2030;

interface DeviceStackedChartProps {
  title: string;
  data: DeviceStackedYearlyEntry[];
  deviceFilters?: DeviceFilterItem[];
}

const DEVICE_COLORS: Record<string, string> = {
  dram: '#3b82f6',
  hbm: '#8b5cf6',
  nand: '#10b981',
  otherMemory: '#14b8a6',
  logic: '#f97316',
  analog: '#ec4899',
  discrete: '#ef4444',
  sensor: '#6366f1',
};

const DEVICE_LABELS: Record<string, string> = {
  dram: 'DRAM',
  hbm: 'HBM',
  nand: 'NAND',
  otherMemory: 'Other Memory',
  logic: 'Logic',
  analog: 'Analog',
  discrete: 'Discrete',
  sensor: 'Sensor',
};

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

export default function DeviceStackedChart({ title, data, deviceFilters }: DeviceStackedChartProps) {
  const { isDark } = useDarkMode();
  const [showYoY, setShowYoY] = useState(false);
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const labelFill = isDark ? '#cbd5e1' : '#374151';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };
  const deviceKeys = ['dram', 'hbm', 'nand', 'otherMemory', 'logic', 'analog', 'discrete', 'sensor'] as const;

  // Find current boundary — dynamically based on current year
  const currentYear = new Date().getFullYear();
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].year <= currentYear) idx = i;
    }
    return idx;
  }, [data, currentYear]);

  // Fixed range 2024-2030
  const filteredData = useMemo(() => {
    return data.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR);
  }, [data]);

  const boundaryYear = currentIdx >= 0 ? data[currentIdx]?.year : undefined;

  const checkedTypes = deviceFilters
    ? new Set(deviceFilters.filter((f) => f.checked).map((f) => f.type))
    : null;
  const activeKeys = deviceKeys.filter((key) => {
    if (checkedTypes && !checkedTypes.has(key)) return false;
    return filteredData.some((entry) => (entry[key] ?? 0) > 0);
  });

  // Dynamic Y-axis domain based on stacked totals
  const yDomain = useMemo(() => {
    if (filteredData.length === 0 || activeKeys.length === 0) return [0, 100];
    const totals = filteredData.map((entry) =>
      activeKeys.reduce((sum, key) => sum + (entry[key] ?? 0), 0),
    );
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);
    const range = maxTotal - minTotal;
    const ratio = range / maxTotal;
    const bottom = ratio < 0.4
      ? Math.max(0, Math.floor((minTotal * 0.85) / 500) * 500)
      : 0;
    const top = Math.ceil((maxTotal * 1.1) / 500) * 500;
    return [bottom, top];
  }, [filteredData, activeKeys]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header: title + time range selector */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYoY((v) => !v)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              showYoY
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            YoY
          </button>
        </div>
      </div>

      <div style={{ height: 200 }}>
        <ChartErrorBoundary chartName="DeviceStackedChart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              formatter={(value: unknown, name?: string) => [
                `${Number(value).toLocaleString()} K/M`,
                DEVICE_LABELS[name ?? ''] ?? name,
              ]}
              labelFormatter={(label) => `${label}년`}
              contentStyle={tooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => DEVICE_LABELS[value] ?? value}
            />
            {boundaryYear && filteredData.some((d) => d.year === boundaryYear) && (
              <ReferenceLine
                x={boundaryYear}
                stroke={isDark ? '#fbbf24' : '#dc2626'}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = viewBox?.x ?? 0;
                  return (
                    <g>
                      <rect
                        x={x - 22}
                        y={2}
                        width={44}
                        height={18}
                        rx={4}
                        fill={isDark ? '#1e293b' : '#fff'}
                        stroke={isDark ? '#fbbf24' : '#dc2626'}
                        strokeWidth={1.5}
                      />
                      <text
                        x={x}
                        y={15}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={800}
                        fill={isDark ? '#fbbf24' : '#dc2626'}
                      >
                        현재
                      </text>
                    </g>
                  );
                }}
              />
            )}
            {activeKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="devices"
                fill={DEVICE_COLORS[key]}
                radius={idx === activeKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              >
                {idx === activeKeys.length - 1 && (
                  <LabelList
                    position="top"
                    content={(props) => {
                      const p = props as { x?: number; y?: number; width?: number; index?: number };
                      const xPos = Number(p.x ?? 0);
                      const yPos = Number(p.y ?? 0);
                      const w = Number(p.width ?? 0);
                      const i = Number(p.index ?? 0);
                      const entry = filteredData[i];
                      if (!entry) return null;
                      const total = activeKeys.reduce((sum, k) => sum + (entry[k] ?? 0), 0);
                      return (
                        <text
                          key={`label-${i}`}
                          x={xPos + w / 2}
                          y={yPos - 5}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={600}
                          fill={labelFill}
                        >
                          {formatBarLabel(total)}
                        </text>
                      );
                    }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      {/* Data table — yearly */}
      {filteredData.length > 0 && activeKeys.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
                  구분
                </th>
                {filteredData.map((d) => (
                  <th
                    key={d.year}
                    className={`text-center px-1.5 py-1 border border-gray-200 font-bold whitespace-nowrap dark:border-gray-600 ${
                      d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {d.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeKeys.map((key, rowIdx) => (
                <Fragment key={key}>
                  <tr className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                    <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: DEVICE_COLORS[key] }}>
                      {DEVICE_LABELS[key]}
                    </td>
                    {filteredData.map((d) => (
                      <td
                        key={d.year}
                        className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                          d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {(d[key] ?? 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  {showYoY && (
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: DEVICE_COLORS[key], opacity: 0.6 }}>YoY</td>
                      {filteredData.map((d, i) => {
                        const cur = d[key] ?? 0;
                        const prev = i > 0 ? (filteredData[i - 1][key] ?? 0) : null;
                        const yoy = prev && prev > 0 ? ((cur - prev) / prev) * 100 : null;
                        const sign = yoy !== null && yoy > 0 ? '+' : '';
                        const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </Fragment>
              ))}
              {/* Total row */}
              <tr className="bg-gray-100 dark:bg-gray-600 font-semibold">
                <td className="px-2 py-1 border border-gray-200 text-gray-700 font-semibold whitespace-nowrap dark:border-gray-600 dark:text-gray-200">
                  Total
                </td>
                {filteredData.map((d) => {
                  const total = activeKeys.reduce((sum, key) => sum + (d[key] ?? 0), 0);
                  return (
                    <td
                      key={d.year}
                      className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                        d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {total.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
              {/* Total YoY */}
              {showYoY && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">YoY</td>
                  {filteredData.map((d, i) => {
                    const total = activeKeys.reduce((sum, key) => sum + (d[key] ?? 0), 0);
                    const prevTotal = i > 0 ? activeKeys.reduce((sum, key) => sum + (filteredData[i - 1][key] ?? 0), 0) : null;
                    const yoy = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
                    const sign = yoy !== null && yoy > 0 ? '+' : '';
                    const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                    return (
                      <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                        {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
