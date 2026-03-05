'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { TimeRange } from './TotalWaferLineChart';
import type { QuarterlyValue } from '@/types/indicators';

interface DataPoint {
  quarter: string;
  value: number;
  isEstimate: boolean;
}

export interface MountDataItem {
  label: string;
  data: QuarterlyValue[];
  color: string;
  group?: 'primary' | 'secondary';
}

interface DemandBarChartProps {
  title: string;
  data: DataPoint[];
  barColor?: string;
  barLabel?: string;
  secondaryData?: DataPoint[];
  secondaryLabel?: string;
  secondaryColor?: string;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  mountData?: MountDataItem[];
}

const TIME_PRESETS: { value: TimeRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

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

function formatTableValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function getYear(quarter: string): string {
  const match = quarter.match(/'(\d{2})$/);
  return match ? `20${match[1]}` : '';
}

function getQuarterLabel(quarter: string): string {
  const match = quarter.match(/^Q(\d)/);
  return match ? `${match[1]}Q` : quarter;
}

export default function DemandBarChart({
  title,
  data,
  barColor = '#3b82f6',
  barLabel,
  secondaryData,
  secondaryLabel,
  secondaryColor = '#8b5cf6',
  timeRange,
  onTimeRangeChange,
  mountData,
}: DemandBarChartProps) {
  const { isDark } = useDarkMode();
  const [showQoQ, setShowQoQ] = useState(false);
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const labelFill = isDark ? '#cbd5e1' : '#374151';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };

  const hasDualBars = !!secondaryData && secondaryData.length > 0;

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

  // Secondary data aligned to same quarters
  const filteredSecondary = useMemo(() => {
    if (!hasDualBars || !secondaryData) return undefined;
    return filteredData.map((d) => {
      const match = secondaryData.find((s) => s.quarter === d.quarter);
      return match ?? { quarter: d.quarter, value: 0, isEstimate: d.isEstimate };
    });
  }, [secondaryData, hasDualBars, filteredData]);

  const boundaryQuarter = currentIdx >= 0 ? data[currentIdx]?.quarter : undefined;

  // Combined chart data for Recharts
  const chartData = useMemo(() => {
    return filteredData.map((d, i) => ({
      quarter: d.quarter,
      isEstimate: d.isEstimate,
      primary: d.value,
      ...(filteredSecondary ? { secondary: filteredSecondary[i]?.value ?? 0 } : {}),
    }));
  }, [filteredData, filteredSecondary]);

  // Dynamic Y-axis with tight domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const values = chartData.flatMap((d) => {
      const v = [d.primary];
      if ('secondary' in d && typeof d.secondary === 'number') v.push(d.secondary);
      return v;
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.15;
    const bottom = Math.max(0, Math.floor((min - padding) / 1000) * 1000);
    const top = Math.ceil((max + padding) / 1000) * 1000;
    return [bottom, top];
  }, [chartData]);

  // Year labels above chart
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
    const groups: { year: string; quarters: DataPoint[] }[] = [];
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

      {/* Year group labels */}
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

      {/* Legend for dual bars */}
      {hasDualBars && (
        <div className="mb-1 flex items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: barColor }} />
            <span className="text-gray-600 dark:text-gray-400">{barLabel}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
            <span className="text-gray-600 dark:text-gray-400">{secondaryLabel}</span>
          </span>
        </div>
      )}

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 8, left: 8, bottom: 4 }}>
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
              formatter={(value, name) => {
                const label = name === 'secondary' ? (secondaryLabel ?? 'Secondary') : (barLabel ?? title);
                return [Number(value).toLocaleString(), label];
              }}
              contentStyle={tooltipStyle}
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
            <Bar dataKey="primary" radius={hasDualBars ? [2, 2, 0, 0] : [3, 3, 0, 0]}>
              <LabelList
                dataKey="primary"
                position="top"
                formatter={(v: unknown) => formatBarLabel(Number(v))}
                style={{ fontSize: hasDualBars ? 8 : 10, fill: labelFill, fontWeight: 600 }}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-p-${index}`}
                  fill={barColor}
                  opacity={entry.isEstimate ? 0.5 : 1}
                />
              ))}
            </Bar>
            {hasDualBars && (
              <Bar dataKey="secondary" radius={[2, 2, 0, 0]}>
                <LabelList
                  dataKey="secondary"
                  position="top"
                  formatter={(v: unknown) => formatBarLabel(Number(v))}
                  style={{ fontSize: 8, fill: labelFill, fontWeight: 600 }}
                />
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-s-${index}`}
                    fill={secondaryColor}
                    opacity={entry.isEstimate ? 0.5 : 1}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data table — year-merged header + mount per unit rows */}
      {filteredData.length > 0 && (
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
              {/* Primary demand row */}
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: barColor }}>
                  {hasDualBars ? barLabel : '수요'}
                </td>
                {filteredData.map((d) => (
                  <td
                    key={d.quarter}
                    className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                      d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {formatTableValue(d.value)}
                  </td>
                ))}
              </tr>
              {/* Primary QoQ */}
              {showQoQ && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].value : null;
                    const qoq = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null;
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
              {/* Primary CAGR (12Q only) */}
              {timeRange === 12 && (() => {
                const vals = filteredData.map((d) => d.value);
                const first = vals[0];
                const last = vals[vals.length - 1];
                const years = (filteredData.length - 1) / 4;
                const cagr = first > 0 && last > 0 && years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;
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
              {/* Primary mount row (Trad. 탑재량) — right after primary demand */}
              {mountData?.filter((m) => m.group === 'primary').map((mount) => (
                <tr key={mount.label} className="bg-gray-50 dark:bg-gray-700">
                  <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[10px]" style={{ color: mount.color }}>
                    {mount.label}
                  </td>
                  {filteredData.map((d) => {
                    const mv = mount.data.find((v) => v.quarter === d.quarter);
                    return (
                      <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[10px] ${mv?.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {mv ? (mv.value >= 1 ? mv.value.toFixed(2) : mv.value.toFixed(3)) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Secondary demand row (AI Server) */}
              {hasDualBars && filteredSecondary && (
                <tr className="bg-white dark:bg-gray-800">
                  <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: secondaryColor }}>
                    {secondaryLabel}
                  </td>
                  {filteredSecondary.map((d) => (
                    <td
                      key={d.quarter}
                      className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                        d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {formatTableValue(d.value)}
                    </td>
                  ))}
                </tr>
              )}
              {/* Secondary QoQ */}
              {showQoQ && hasDualBars && filteredSecondary && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                  {filteredSecondary.map((d, i) => {
                    const prev = i > 0 ? filteredSecondary[i - 1].value : null;
                    const qoq = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null;
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
              {/* Secondary CAGR (12Q only) */}
              {timeRange === 12 && hasDualBars && filteredSecondary && (() => {
                const vals = filteredSecondary.map((d) => d.value);
                const first = vals[0];
                const last = vals[vals.length - 1];
                const years = (filteredSecondary.length - 1) / 4;
                const cagr = first > 0 && last > 0 && years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;
                return (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                    <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-blue-600 whitespace-nowrap dark:border-gray-600 dark:text-blue-400">CAGR</td>
                    <td
                      colSpan={filteredSecondary.length}
                      className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold text-blue-600 dark:border-gray-600 dark:text-blue-400"
                    >
                      {cagr !== null ? `${cagr > 0 ? '+' : ''}${cagr.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })()}
              {/* Secondary mount row (AI 탑재량) — right after secondary demand */}
              {mountData?.filter((m) => m.group === 'secondary').map((mount) => (
                <tr key={mount.label} className="bg-gray-50 dark:bg-gray-700">
                  <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[10px]" style={{ color: mount.color }}>
                    {mount.label}
                  </td>
                  {filteredData.map((d) => {
                    const mv = mount.data.find((v) => v.quarter === d.quarter);
                    return (
                      <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[10px] ${mv?.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {mv ? (mv.value >= 1 ? mv.value.toFixed(2) : mv.value.toFixed(3)) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Ungrouped mount rows (non-server apps) */}
              {mountData?.filter((m) => !m.group).map((mount, mIdx) => (
                <tr key={mount.label} className={mIdx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}>
                  <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[10px]" style={{ color: mount.color }}>
                    {mount.label}
                  </td>
                  {filteredData.map((d) => {
                    const mv = mount.data.find((v) => v.quarter === d.quarter);
                    return (
                      <td key={d.quarter} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[10px] ${mv?.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {mv ? (mv.value >= 1 ? mv.value.toFixed(2) : mv.value.toFixed(3)) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
