'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { TotalWaferQuarterlyEntry } from '@/types/v3';
import { useDarkMode } from '@/hooks/useDarkMode';

export type TimeRange = 4 | 8 | 12;

interface Props {
  data: TotalWaferQuarterlyEntry[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

const TIME_PRESETS: { value: TimeRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

function formatYAxis(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** TimeRange value IS the number of quarters to display */

function getYear(quarter: string): string {
  const match = quarter.match(/'(\d{2})$/);
  return match ? `20${match[1]}` : '';
}

function getQuarterLabel(quarter: string): string {
  const match = quarter.match(/^Q(\d)/);
  return match ? `${match[1]}Q` : quarter;
}

export default function TotalWaferLineChart({ data, timeRange: controlledRange, onTimeRangeChange }: Props) {
  const { isDark } = useDarkMode();
  const [internalRange, setInternalRange] = useState<TimeRange>(8);
  const [showQoQ, setShowQoQ] = useState(false);
  const timeRange = controlledRange ?? internalRange;
  const setTimeRange = onTimeRangeChange ?? setInternalRange;
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';

  // Find current boundary index (last actual data point)
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (!data[i].isEstimate) { idx = i; break; }
    }
    return idx;
  }, [data]);

  // Center the view around current boundary
  const filteredData = useMemo(() => {
    const quarters = timeRange;
    const half = Math.floor(quarters / 2);
    const center = currentIdx >= 0 ? currentIdx : Math.floor(data.length / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(data.length, start + quarters);
    const adjustedStart = Math.max(0, end - quarters);
    return data.slice(adjustedStart, end);
  }, [data, timeRange, currentIdx]);

  const boundaryQuarter = currentIdx >= 0 ? data[currentIdx].quarter : undefined;

  // Compute year labels for x-axis grouping
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

  // Group data by year for table
  const yearGroups = useMemo(() => {
    const groups: { year: string; quarters: TotalWaferQuarterlyEntry[] }[] = [];
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
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800" style={{ minHeight: 530 }}>
      {/* Header row: title + time range buttons + legend */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="shrink-0 text-base font-bold text-gray-800 dark:text-gray-100">
          Total Wafer 수요
        </h3>

        {/* QoQ toggle + Time range presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQoQ((v) => !v)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
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
              onClick={() => setTimeRange(preset.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                timeRange === preset.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            PW
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            EPI
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
            실적
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-gray-400 bg-white dark:bg-gray-800" />
            예측
          </span>
        </div>
      </div>

      {/* Year group labels — larger text */}
      <div className="mb-1 flex" style={{ marginLeft: 53, marginRight: 16 }}>
        {yearLabels.map((yl) => {
          const total = filteredData.length;
          const span = yl.endIdx - yl.startIdx + 1;
          const widthPct = (span / total) * 100;
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

      {/* Chart area — fixed height */}
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 28, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
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
              width={45}
              label={{ value: 'Kwsm', angle: -90, position: 'insideLeft', fontSize: 11, fill: tickFill, offset: 5 }}
            />
            <Tooltip
              formatter={(value: number | undefined, name?: string) => {
                const label = name === 'pw' ? 'PW' : name === 'epi' ? 'EPI' : 'Total';
                return [`${(value ?? 0).toLocaleString()} Kwsm`, label];
              }}
              contentStyle={isDark
                ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
                : { fontSize: 13, borderRadius: 6 }
              }
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
            {/* PW line - blue */}
            <Line
              type="monotone"
              dataKey="pw"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: TotalWaferQuarterlyEntry };
                if (!payload) return <circle key="empty-pw" />;
                return (
                  <circle
                    key={`pw-${payload.quarter}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#2563eb'}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#2563eb' }}
            />
            {/* EPI line - green */}
            <Line
              type="monotone"
              dataKey="epi"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: TotalWaferQuarterlyEntry };
                if (!payload) return <circle key="empty-epi" />;
                return (
                  <circle
                    key={`epi-${payload.quarter}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#10b981'}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data table — year-merged header, EPI/PW order */}
      {filteredData.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Year row with colspan */}
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
              {/* Quarter row */}
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
              {/* EPI */}
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-2 py-1 border border-gray-200 font-medium text-emerald-600 whitespace-nowrap dark:border-gray-600">EPI</td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {d.epi.toLocaleString()}
                  </td>
                ))}
              </tr>
              {/* EPI QoQ */}
              {showQoQ && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-emerald-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].epi : null;
                    const qoq = prev && prev > 0 ? ((d.epi - prev) / prev) * 100 : null;
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
              {/* PW */}
              <tr className="bg-gray-50 dark:bg-gray-700">
                <td className="px-2 py-1 border border-gray-200 font-medium text-blue-600 whitespace-nowrap dark:border-gray-600">PW</td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {d.pw.toLocaleString()}
                  </td>
                ))}
              </tr>
              {/* PW QoQ */}
              {showQoQ && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-blue-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].pw : null;
                    const qoq = prev && prev > 0 ? ((d.pw - prev) / prev) * 100 : null;
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
              {/* Total */}
              <tr className="bg-gray-100 dark:bg-gray-600 font-semibold">
                <td className="px-2 py-1 border border-gray-200 font-semibold text-gray-700 whitespace-nowrap dark:border-gray-600 dark:text-gray-200">Total</td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                    {d.total.toLocaleString()}
                  </td>
                ))}
              </tr>
              {/* Total QoQ */}
              {showQoQ && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].total : null;
                    const qoq = prev && prev > 0 ? ((d.total - prev) / prev) * 100 : null;
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
              {/* CAGR rows (12Q only) */}
              {timeRange === 12 && (() => {
                const first = filteredData[0];
                const last = filteredData[filteredData.length - 1];
                const years = (filteredData.length - 1) / 4;
                if (!first || !last || years <= 0) return null;
                const calc = (start: number, end: number) =>
                  start > 0 && end > 0 ? (Math.pow(end / start, 1 / years) - 1) * 100 : null;
                const epiCagr = calc(first.epi, last.epi);
                const pwCagr = calc(first.pw, last.pw);
                const totalCagr = calc(first.total, last.total);
                const fmt = (v: number | null) => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '-';
                return (
                  <>
                    <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-blue-600 whitespace-nowrap dark:border-gray-600 dark:text-blue-400">CAGR</td>
                      <td
                        colSpan={filteredData.length}
                        className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold text-blue-600 dark:border-gray-600 dark:text-blue-400"
                      >
                        EPI {fmt(epiCagr)} / PW {fmt(pwCagr)} / Total {fmt(totalCagr)}
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
