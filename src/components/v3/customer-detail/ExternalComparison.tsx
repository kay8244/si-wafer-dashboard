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
  customerType: 'memory' | 'foundry';
}

type QuarterRange = 4 | 8 | 12;
type MetricKey = 'waferIn' | 'waferOut' | 'ubsGrowth' | 'tfGrowth';

const TIME_PRESETS: { value: QuarterRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'waferIn', label: 'Wafer In' },
  { key: 'waferOut', label: 'Wafer Out' },
  { key: 'ubsGrowth', label: 'Bit Growth (UBS)' },
  { key: 'tfGrowth', label: 'Bit Growth (TF)' },
];

interface CombinedEntry {
  quarter: string;
  waferIn: number;
  waferOut: number;
  waferInDram: number;
  waferInNand: number;
  waferOutDram: number;
  waferOutNand: number;
  ubsGrowth: number;
  tfGrowth: number;
  isEstimate: boolean;
}

function getYear(quarter: string): string {
  const match = quarter.match(/'(\d{2})/);
  return match ? `20${match[1]}` : '';
}

function getQuarterLabel(quarter: string): string {
  const match = quarter.match(/^Q(\d)/);
  return match ? `${match[1]}Q` : quarter;
}

export default function ExternalComparison({ data, waferInOutData, bitGrowthData, quarterRange, onQuarterRangeChange, customerType }: Props) {
  // Foundry customers: show placeholder instead of wafer in/out data
  if (customerType === 'foundry') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-bold text-gray-800 dark:text-gray-100">Wafer In/Out</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">지표 선정중</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">파운드리 고객사의 Wafer In/Out 및 Bit Growth 지표는 현재 선정 중입니다.</p>
        </div>
      </div>
    );
  }

  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [waferFilter, setWaferFilter] = useState<'all' | 'dram' | 'nand'>('all');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(new Set(['waferIn']));

  const isMemory = customerType === 'memory';
  const hasDramRatio = waferInOutData.some((d) => d.dramRatio !== undefined);
  const canFilter = isMemory && hasDramRatio;
  const canSplit = canFilter && waferFilter === 'all';

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // keep at least one
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
      const dr = w.dramRatio ?? 0.6;
      // Apply DRAM/NAND filter for single-mode
      const ratio = canFilter && w.dramRatio !== undefined
        ? (waferFilter === 'dram' ? dr : waferFilter === 'nand' ? (1 - dr) : 1)
        : 1;
      return {
        quarter: w.quarter,
        waferIn: +(w.waferIn * ratio).toFixed(1),
        waferOut: +(w.waferOut * ratio).toFixed(1),
        waferInDram: +(w.waferIn * dr).toFixed(1),
        waferInNand: +(w.waferIn * (1 - dr)).toFixed(1),
        waferOutDram: +(w.waferOut * dr).toFixed(1),
        waferOutNand: +(w.waferOut * (1 - dr)).toFixed(1),
        ubsGrowth: bg ? +bg.growth.toFixed(1) : 0,
        tfGrowth: bg?.growthTF != null ? +bg.growthTF.toFixed(1) : (bg ? +(bg.growth * 0.95).toFixed(1) : 0),
        isEstimate: w.isEstimate,
      };
    });
  }, [waferInOutData, bitGrowthData, quarterRange, currentIdx, canFilter, waferFilter]);

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

  const showIn = visibleMetrics.has('waferIn');
  const showOut = visibleMetrics.has('waferOut');
  const showUbsGrowth = visibleMetrics.has('ubsGrowth');
  const showTfGrowth = visibleMetrics.has('tfGrowth');
  const showAnyGrowth = showUbsGrowth || showTfGrowth;

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

      {/* Filter row: DRAM/NAND/ALL + Metric toggles */}
      <div className="mb-2 flex items-center gap-2">
        {canFilter && (
          <div className="flex items-center gap-1">
            {(['all', 'dram', 'nand'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setWaferFilter(f)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  waferFilter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {canFilter && <div className="h-3 w-px bg-gray-200 dark:bg-gray-600" />}
        <div className="flex items-center gap-1">
          {METRIC_OPTIONS.map((m) => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                visibleMetrics.has(m.key)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
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

      {/* Combined Chart */}
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
            {showAnyGrowth && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  waferIn: 'Wafer In (UBS)',
                  waferInDram: 'In DRAM',
                  waferInNand: 'In NAND',
                  waferOut: 'Wafer Out (TF)',
                  waferOutDram: 'Out DRAM',
                  waferOutNand: 'Out NAND',
                  ubsGrowth: 'Bit Growth (UBS)',
                  tfGrowth: 'Bit Growth (TF)',
                };
                const n = String(name);
                const unit = n.includes('Growth') ? '%' : ' Km\u00B2';
                return [`${Number(value).toLocaleString()}${unit}`, labels[n] ?? n];
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

            {/* Wafer In bars */}
            {showIn && !canSplit && (
              <Bar yAxisId="left" dataKey="waferIn" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} stackId={undefined}>
                {filteredData.map((entry, i) => (
                  <Cell key={`in-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showIn && canSplit && (
              <Bar yAxisId="left" dataKey="waferInNand" fill="#93c5fd" stackId="in" barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`in-nand-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showIn && canSplit && (
              <Bar yAxisId="left" dataKey="waferInDram" fill="#3b82f6" stackId="in" radius={[2, 2, 0, 0]} barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`in-dram-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}

            {/* Wafer Out bars */}
            {showOut && !canSplit && (
              <Bar yAxisId="left" dataKey="waferOut" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`out-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showOut && canSplit && (
              <Bar yAxisId="left" dataKey="waferOutNand" fill="#6ee7b7" stackId="out" barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`out-nand-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showOut && canSplit && (
              <Bar yAxisId="left" dataKey="waferOutDram" fill="#10b981" stackId="out" radius={[2, 2, 0, 0]} barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`out-dram-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}

            {/* Bit Growth (UBS) line */}
            {showUbsGrowth && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ubsGrowth"
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
                      key={`ubs-${payload.quarter}`}
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
            )}
            {/* Bit Growth (TF) line */}
            {showTfGrowth && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tfGrowth"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, payload } = props as {
                    cx: number;
                    cy: number;
                    payload: CombinedEntry;
                  };
                  if (!payload) return <circle key="empty" />;
                  return (
                    <circle
                      key={`tf-${payload.quarter}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#ef4444'}
                      stroke="#ef4444"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[9px] text-gray-500 dark:text-gray-400">
        {showIn && !canSplit && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-500" />
            In (UBS, Km²)
          </span>
        )}
        {showIn && canSplit && (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-500" />
              In DRAM
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-300" />
              In NAND
            </span>
          </>
        )}
        {showOut && !canSplit && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-emerald-500" />
            Out (TF, Km²)
          </span>
        )}
        {showOut && canSplit && (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-2.5 rounded-sm bg-emerald-500" />
              Out DRAM
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-2.5 rounded-sm bg-emerald-300" />
              Out NAND
            </span>
          </>
        )}
        {showUbsGrowth && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-amber-500" />
            Bit Growth (UBS)
          </span>
        )}
        {showTfGrowth && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-red-500" />
            Bit Growth (TF)
          </span>
        )}
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
              {showIn && (
                <>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#3b82f6' }}>
                      In (UBS)
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.waferIn.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    ))}
                  </tr>
                  {canSplit && (
                    <>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#3b82f6', paddingLeft: 12 }}>
                          DRAM
                        </td>
                        {filteredData.map((d) => (
                          <td key={d.quarter} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {d.waferInDram.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#93c5fd', paddingLeft: 12 }}>
                          NAND
                        </td>
                        {filteredData.map((d) => (
                          <td key={d.quarter} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {d.waferInNand.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                    {filteredData.map((d, i) => {
                      const prev = i > 0 ? filteredData[i - 1].waferIn : null;
                      const qoq = prev && prev > 0 ? ((d.waferIn - prev) / prev) * 100 : null;
                      const sign = qoq !== null && qoq > 0 ? '+' : '';
                      const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-red-500' : qoq < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.quarter} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {qoq !== null ? `${sign}${qoq.toFixed(1)}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {/* Wafer Out */}
              {showOut && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#10b981' }}>
                      Out (TF)
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.waferOut.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    ))}
                  </tr>
                  {canSplit && (
                    <>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#10b981', paddingLeft: 12 }}>
                          DRAM
                        </td>
                        {filteredData.map((d) => (
                          <td key={d.quarter} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {d.waferOutDram.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#6ee7b7', paddingLeft: 12 }}>
                          NAND
                        </td>
                        {filteredData.map((d) => (
                          <td key={d.quarter} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {d.waferOutNand.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                    {filteredData.map((d, i) => {
                      const prev = i > 0 ? filteredData[i - 1].waferOut : null;
                      const qoq = prev && prev > 0 ? ((d.waferOut - prev) / prev) * 100 : null;
                      const sign = qoq !== null && qoq > 0 ? '+' : '';
                      const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-red-500' : qoq < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.quarter} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {qoq !== null ? `${sign}${qoq.toFixed(1)}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {/* Bit Growth (UBS) */}
              {showUbsGrowth && (
                <>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#f59e0b' }}>
                      Bit Growth (UBS)
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.ubsGrowth.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전분기比</td>
                    {filteredData.map((d, i) => {
                      const prev = i > 0 ? filteredData[i - 1].ubsGrowth : null;
                      const delta = prev !== null ? d.ubsGrowth - prev : null;
                      const sign = delta !== null && delta > 0 ? '+' : '';
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-red-500' : delta < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.quarter} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {delta !== null ? `${sign}${delta.toFixed(1)}%p` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {/* Bit Growth (TF) */}
              {showTfGrowth && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#ef4444' }}>
                      Bit Growth (TF)
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.quarter} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.tfGrowth.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전분기比</td>
                    {filteredData.map((d, i) => {
                      const prev = i > 0 ? filteredData[i - 1].tfGrowth : null;
                      const delta = prev !== null ? d.tfGrowth - prev : null;
                      const sign = delta !== null && delta > 0 ? '+' : '';
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-red-500' : delta < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.quarter} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {delta !== null ? `${sign}${delta.toFixed(1)}%p` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
