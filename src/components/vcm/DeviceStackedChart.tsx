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
import type { DeviceStackedEntry, DeviceFilterItem } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { TimeRange } from './TotalWaferLineChart';

interface DeviceStackedChartProps {
  title: string;
  data: DeviceStackedEntry[];
  deviceFilters?: DeviceFilterItem[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_PRESETS: { value: TimeRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

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

/** TimeRange value IS the number of quarters */

function getYear(quarter: string): string {
  const match = quarter.match(/'(\d{2})$/);
  return match ? `20${match[1]}` : '';
}

function getQuarterLabel(quarter: string): string {
  const match = quarter.match(/^Q(\d)/);
  return match ? `${match[1]}Q` : quarter;
}

export default function DeviceStackedChart({ title, data, deviceFilters, timeRange, onTimeRangeChange }: DeviceStackedChartProps) {
  const { isDark } = useDarkMode();
  const [showQoQ, setShowQoQ] = useState(true);
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const labelFill = isDark ? '#cbd5e1' : '#374151';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };
  const deviceKeys = ['dram', 'hbm', 'nand', 'otherMemory', 'logic', 'analog', 'discrete', 'sensor'] as const;

  // Find current boundary (last non-estimate)
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (!data[i].isEstimate) { idx = i; break; }
    }
    return idx;
  }, [data]);

  // Time-centered filtering
  const filteredData = useMemo(() => {
    const quarters = timeRange;
    const half = Math.floor(quarters / 2);
    const center = currentIdx >= 0 ? currentIdx : Math.floor(data.length / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(data.length, start + quarters);
    const adjustedStart = Math.max(0, end - quarters);
    return data.slice(adjustedStart, end);
  }, [data, timeRange, currentIdx]);

  const boundaryQuarter = currentIdx >= 0 ? data[currentIdx]?.quarter : undefined;

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
    const maxTotal = Math.max(...totals);
    const top = Math.ceil((maxTotal * 1.15) / 100) * 100;
    return [0, top];
  }, [filteredData, activeKeys]);

  // Year group labels
  const yearLabels = useMemo(() => {
    const labels: { year: string; startIdx: number; endIdx: number }[] = [];
    let prevYear = '';
    filteredData.forEach((d, i) => {
      const yr = getYear(d.quarter);
      if (yr !== prevYear) {
        if (labels.length > 0) labels[labels.length - 1].endIdx = i - 1;
        labels.push({ year: yr, startIdx: i, endIdx: i });
        prevYear = yr;
      } else if (labels.length > 0) {
        labels[labels.length - 1].endIdx = i;
      }
    });
    return labels;
  }, [filteredData]);

  // Year groups for table
  const yearGroups = useMemo(() => {
    const groups: { year: string; quarters: DeviceStackedEntry[] }[] = [];
    filteredData.forEach((d) => {
      const yr = getYear(d.quarter);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) {
        last.quarters.push(d);
      } else {
        groups.push({ year: yr, quarters: [d] });
      }
    });
    return groups;
  }, [filteredData]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header: title + time range selector */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQoQ((v) => !v)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              showQoQ
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            QoQ
          </button>
        </div>
        <div className="flex items-center gap-1">
          {TIME_PRESETS.map((preset) => (
            <button
              key={String(preset.value)}
              onClick={() => onTimeRangeChange(preset.value)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                timeRange === preset.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year group labels — ABOVE chart */}
      {yearLabels.length > 1 && (
        <div className="mb-1 flex" style={{ marginLeft: 50, marginRight: 8 }}>
          {yearLabels.map((yl) => {
            const span = yl.endIdx - yl.startIdx + 1;
            const widthPct = (span / filteredData.length) * 100;
            return (
              <div
                key={yl.year}
                className="text-center text-sm font-bold text-gray-500 dark:text-gray-400"
                style={{ width: `${widthPct}%` }}
              >
                {yl.year}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredData} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
            <XAxis
              dataKey="quarter"
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
                `${Number(value).toLocaleString()} Kwsm`,
                DEVICE_LABELS[name ?? ''] ?? name,
              ]}
              contentStyle={tooltipStyle}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => DEVICE_LABELS[value] ?? value}
            />
            {boundaryQuarter && filteredData.some((d) => d.quarter === boundaryQuarter) && (
              <ReferenceLine
                x={boundaryQuarter}
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
      </div>

      {/* Data table — year-merged header */}
      {filteredData.length > 0 && activeKeys.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th
                  rowSpan={2}
                  className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle"
                >
                  구분
                </th>
                {yearGroups.map((g) => (
                  <th
                    key={g.year}
                    colSpan={g.quarters.length}
                    className="text-center px-1 py-1 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap"
                  >
                    {g.year}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-600">
                {filteredData.map((d) => (
                  <th
                    key={d.quarter}
                    className={`text-center px-1.5 py-1 border border-gray-200 font-semibold whitespace-nowrap dark:border-gray-600 ${
                      d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {getQuarterLabel(d.quarter)}
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
                        key={d.quarter}
                        className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                          d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {(d[key] ?? 0).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  {showQoQ && (
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: DEVICE_COLORS[key], opacity: 0.6 }}>QoQ</td>
                      {filteredData.map((d, i) => {
                        const cur = d[key] ?? 0;
                        const prev = i > 0 ? (filteredData[i - 1][key] ?? 0) : null;
                        const qoq = prev && prev > 0 ? ((cur - prev) / prev) * 100 : null;
                        const sign = qoq !== null && qoq > 0 ? '+' : '';
                        const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-red-500' : qoq < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.quarter} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {qoq !== null ? `${sign}${qoq.toFixed(1)}%` : '-'}
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
                      key={d.quarter}
                      className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                        d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {total.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
              {/* Total QoQ */}
              {showQoQ && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredData.map((d, i) => {
                    const total = activeKeys.reduce((sum, key) => sum + (d[key] ?? 0), 0);
                    const prevTotal = i > 0 ? activeKeys.reduce((sum, key) => sum + (filteredData[i - 1][key] ?? 0), 0) : null;
                    const qoq = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
                    const sign = qoq !== null && qoq > 0 ? '+' : '';
                    const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-red-500' : qoq < 0 ? 'text-blue-500' : 'text-gray-400';
                    return (
                      <td key={d.quarter} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                        {qoq !== null ? `${sign}${qoq.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              )}
              {/* CAGR row (12Q only) */}
              {timeRange === 12 && (() => {
                const first = filteredData[0];
                const last = filteredData[filteredData.length - 1];
                const years = (filteredData.length - 1) / 4;
                if (!first || !last || years <= 0) return null;
                const firstTotal = activeKeys.reduce((sum, key) => sum + (first[key] ?? 0), 0);
                const lastTotal = activeKeys.reduce((sum, key) => sum + (last[key] ?? 0), 0);
                const cagr = firstTotal > 0 && lastTotal > 0 ? (Math.pow(lastTotal / firstTotal, 1 / years) - 1) * 100 : null;
                return (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                    <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-blue-600 whitespace-nowrap dark:border-gray-600 dark:text-blue-400">CAGR</td>
                    <td
                      colSpan={filteredData.length}
                      className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold text-blue-600 dark:border-gray-600 dark:text-blue-400"
                    >
                      {cagr !== null ? `${cagr > 0 ? '+' : ''}${cagr.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
