'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import type {
  ExternalComparison as ExternalComparisonType,
  WaferInOutQuarterlyEntry,
  BitGrowthQuarterlyEntry,
} from '@/types/v3';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Props {
  data: ExternalComparisonType[];
  waferInOutData: WaferInOutQuarterlyEntry[];
  bitGrowthData: BitGrowthQuarterlyEntry[];
  quarterRange: 4 | 8 | 12;
  onQuarterRangeChange: (range: 4 | 8 | 12) => void;
}

type QuarterRange = 4 | 8 | 12;

const TIME_PRESETS: { value: QuarterRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

interface CombinedEntry {
  quarter: string;
  waferIn: number;
  waferOut: number;
  bitGrowth: number;
  isEstimate: boolean;
}

/** Source-specific multiplier for chart data differentiation */
const SOURCE_FACTOR: Record<string, number> = {
  Omdia: 1.0,
  TrendForce: 0.97,
};

function getYear(quarter: string): string {
  const match = quarter.match(/'(\d{2})/);
  return match ? `20${match[1]}` : '';
}

function getQuarterLabel(quarter: string): string {
  const match = quarter.match(/^Q(\d)/);
  return match ? `${match[1]}Q` : quarter;
}

export default function ExternalComparison({ data, waferInOutData, bitGrowthData, quarterRange, onQuarterRangeChange }: Props) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [selectedSource, setSelectedSource] = useState<string>(data[0]?.source ?? 'Omdia');

  const factor = SOURCE_FACTOR[selectedSource] ?? 1.0;

  // Find current boundary (first estimate = current quarter)
  const currentIdx = useMemo(() => {
    for (let i = 0; i < waferInOutData.length; i++) {
      if (waferInOutData[i].isEstimate) return i;
    }
    return waferInOutData.length - 1;
  }, [waferInOutData]);

  // Center view around current boundary
  const filteredData = useMemo((): CombinedEntry[] => {
    const half = Math.floor(quarterRange / 2);
    const center = currentIdx >= 0 ? currentIdx : Math.floor(waferInOutData.length / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(waferInOutData.length, start + quarterRange);
    const adjustedStart = Math.max(0, end - quarterRange);

    return waferInOutData.slice(adjustedStart, end).map((w, i) => {
      const globalIdx = adjustedStart + i;
      const bg = globalIdx < bitGrowthData.length ? bitGrowthData[globalIdx] : null;
      return {
        quarter: w.quarter,
        waferIn: +(w.waferIn * factor).toFixed(1),
        waferOut: +(w.waferOut * factor).toFixed(1),
        bitGrowth: bg ? +(bg.growth * factor).toFixed(1) : 0,
        isEstimate: w.isEstimate,
      };
    });
  }, [waferInOutData, bitGrowthData, quarterRange, currentIdx, factor]);

  const boundaryQuarter = currentIdx >= 0 ? waferInOutData[currentIdx]?.quarter : undefined;

  // Year labels for table header merging
  const yearGroups = useMemo(() => {
    const groups: { year: string; quarters: CombinedEntry[] }[] = [];
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

  // Year labels for chart
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

  const tooltipStyle = isDark
    ? { fontSize: 11, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 11, borderRadius: 6 };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Wafer In/Out</h3>
        <div className="flex items-center gap-1">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onQuarterRangeChange(preset.value)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                quarterRange === preset.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source toggle — no summary numbers */}
      <div className="mb-2 flex items-center gap-1">
        {data.map((src) => (
          <button
            key={src.source}
            onClick={() => setSelectedSource(src.source)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              selectedSource === src.source
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {src.source}
          </button>
        ))}
      </div>

      {/* Year labels above chart */}
      {yearLabels.length > 1 && (
        <div className="mb-1 flex" style={{ marginLeft: 32, marginRight: 28 }}>
          {yearLabels.map((yl) => {
            const span = yl.endIdx - yl.startIdx + 1;
            const widthPct = (span / filteredData.length) * 100;
            return (
              <div
                key={yl.year}
                className="text-center text-[10px] font-bold text-gray-500 dark:text-gray-400"
                style={{ width: `${widthPct}%` }}
              >
                {yl.year}
              </div>
            );
          })}
        </div>
      )}

      {/* Combined Chart: Wafer In/Out bars + Bit Growth line */}
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 20, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              tickFormatter={getQuarterLabel}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={32}
              label={{ value: 'Km\u00B2', position: 'insideTopLeft', offset: -5, fontSize: 8, fill: tickFill }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={28}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const label =
                  name === 'waferIn' ? 'Wafer In' : name === 'waferOut' ? 'Wafer Out' : 'Bit Growth';
                const unit = name === 'bitGrowth' ? '%' : ' Km\u00B2';
                return [`${Number(value).toLocaleString()}${unit}`, label];
              }}
            />
            {boundaryQuarter && filteredData.some((d) => d.quarter === boundaryQuarter) && (
              <ReferenceLine
                yAxisId="left"
                x={boundaryQuarter}
                stroke={isDark ? '#fbbf24' : '#dc2626'}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = viewBox?.x ?? 0;
                  return (
                    <g>
                      <rect
                        x={x - 16}
                        y={2}
                        width={32}
                        height={14}
                        rx={3}
                        fill={isDark ? '#1e293b' : '#fff'}
                        stroke={isDark ? '#fbbf24' : '#dc2626'}
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={12}
                        textAnchor="middle"
                        fontSize={9}
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
            <Bar yAxisId="left" dataKey="waferIn" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8}>
              {filteredData.map((entry, i) => (
                <Cell key={`in-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
              ))}
            </Bar>
            <Bar yAxisId="left" dataKey="waferOut" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8}>
              {filteredData.map((entry, i) => (
                <Cell key={`out-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bitGrowth"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as {
                  cx: number;
                  cy: number;
                  payload: CombinedEntry;
                };
                if (!payload) return <circle key="empty" />;
                return (
                  <circle
                    key={payload.quarter}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#f59e0b'}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[9px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-500" />
          In (Km²)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-2.5 rounded-sm bg-emerald-500" />
          Out (Km²)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-2.5 rounded-sm bg-amber-500" />
          Growth (%)
        </span>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
          실적
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full border border-gray-400 bg-white dark:bg-gray-800" />
          예측
        </span>
      </div>

      {/* Data Table — syncs with chart */}
      {filteredData.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              {/* Year row */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th
                  rowSpan={2}
                  className="text-left px-1.5 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle"
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
                    className="text-center px-1 py-1 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300"
                  >
                    {getQuarterLabel(d.quarter)}
                    {d.isEstimate && <span className="text-[8px] text-gray-400">(E)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Wafer In */}
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#3b82f6' }}>
                  Wafer In
                </td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    {d.waferIn.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                ))}
              </tr>
              {/* Wafer Out */}
              <tr className="bg-gray-50 dark:bg-gray-700">
                <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#10b981' }}>
                  Wafer Out
                </td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    {d.waferOut.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                ))}
              </tr>
              {/* Bit Growth */}
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#f59e0b' }}>
                  Bit Growth
                </td>
                {filteredData.map((d) => (
                  <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                    {d.bitGrowth.toFixed(1)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
