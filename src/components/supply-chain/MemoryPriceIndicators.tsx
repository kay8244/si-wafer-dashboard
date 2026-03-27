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
  Legend,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { MemoryPriceIndicatorData } from '@/hooks/useSupplyChainData';
import {
  pearsonCorrelation,
  formatOverlayValue,
  CHART_COLORS,
  SELECTION_COLORS,
  TIME_RANGES,
  tightDomain,
  type OverlayLine,
  type TimeRange,
} from '@/lib/chart-utils';
import CorrelationBadges from '@/components/supply-chain/CorrelationBadges';

const TABLE_MONTHS = 12;

interface MemoryPriceIndicator {
  id: string;
  name: string;
  unit: string;
  data: { month: string; value: number }[];
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  indicators: MemoryPriceIndicatorData[];
  overlayData?: OverlayLine[];
}

export default function MemoryPriceIndicators({ indicators: indicatorData, overlayData = [] }: Props) {
  const INDICATORS: MemoryPriceIndicator[] = indicatorData;

  // Derive months from the indicator data
  const ALL_MONTHS = useMemo(() => {
    const set = new Set<string>();
    for (const ind of INDICATORS) {
      for (const d of ind.data) set.add(d.month);
    }
    return Array.from(set).sort();
  }, [INDICATORS]);

  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';

  const [selectedIds, setSelectedIds] = useState<string[]>(['ddr4_8g_pc']);
  const [timeRange, setTimeRange] = useState<TimeRange>(12);

  const toggleIndicator = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 3) return [...prev, id];
      return [...prev.slice(1), id];
    });
  };

  const tableMonths = ALL_MONTHS.slice(-TABLE_MONTHS);

  // Year groups
  const yearGroups = useMemo(() => {
    const groups: { year: string; count: number }[] = [];
    for (const m of tableMonths) {
      const yr = m.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) last.count++;
      else groups.push({ year: yr, count: 1 });
    }
    return groups;
  }, [tableMonths]);

  // Year boundary indices for vertical border
  const yearBoundaryIndices = useMemo(() => {
    const set = new Set<number>();
    let acc = 0;
    for (const g of yearGroups) {
      if (acc > 0) set.add(acc);
      acc += g.count;
    }
    return set;
  }, [yearGroups]);

  // Chart
  const chartMonths = ALL_MONTHS.slice(-timeRange);
  const selectedIndicators = INDICATORS.filter((ind) => selectedIds.includes(ind.id));

  const filteredOverlay = useMemo(() => {
    if (overlayData.length === 0) return [];
    const monthSet = new Set(chartMonths);
    return overlayData.map((ol) => ({
      ...ol,
      data: ol.data.filter((d) => monthSet.has(d.month)),
    }));
  }, [overlayData, chartMonths]);

  const chartData = useMemo(() => {
    return chartMonths.map((month) => {
      const entry: Record<string, unknown> = { month: month.slice(2) };
      for (const ind of selectedIndicators) {
        const point = ind.data.find((d) => d.month === month);
        entry[ind.id] = point?.value ?? 0;
      }
      for (const ol of filteredOverlay) {
        const point = ol.data.find((d) => d.month === month);
        if (point) entry[`overlay_${ol.name}`] = point.value;
      }
      return entry;
    });
  }, [chartMonths, selectedIndicators, filteredOverlay]);

  // Tight domain for overlay right Y-axis (15% padding)
  const overlayDomain = useMemo(() => {
    if (filteredOverlay.length === 0) return undefined;
    const vals = filteredOverlay.flatMap((ol) => ol.data.map((d) => d.value));
    return tightDomain(vals);
  }, [filteredOverlay]);

  // Tight domain for left Y-axis (15% padding around data range, no negatives)
  const leftDomain = useMemo(() => {
    const vals = selectedIndicators.flatMap((ind) =>
      ind.data.filter((d) => chartMonths.includes(d.month)).map((d) => d.value)
    );
    return tightDomain(vals, false);
  }, [selectedIndicators, chartMonths]);

  // Correlation: first selected indicator vs each overlay
  const correlations = useMemo(() => {
    if (filteredOverlay.length === 0 || selectedIndicators.length === 0) return [];
    const ref = selectedIndicators[0];
    const refByMonth = new Map(ref.data.map((d) => [d.month, d.value]));
    const result: { name: string; r: number; color: string }[] = [];
    for (const ol of filteredOverlay) {
      const pairs: { x: number; y: number }[] = [];
      for (const d of ol.data) {
        const x = refByMonth.get(d.month);
        if (x !== undefined) pairs.push({ x, y: d.value });
      }
      const r = pearsonCorrelation(pairs.map((p) => p.x), pairs.map((p) => p.y));
      if (r !== null) result.push({ name: ol.name, r, color: ol.color });
    }
    return result;
  }, [filteredOverlay, selectedIndicators]);

  return (
    <div className="flex flex-col gap-5">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
          <thead>
            {/* Year row */}
            <tr className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <th className="px-3 py-1.5 text-left font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-600" rowSpan={2}>
                구분
              </th>
              {yearGroups.map((g) => (
                <th key={g.year} colSpan={g.count} className="px-3 py-1.5 text-center font-bold whitespace-nowrap border-b border-gray-200 dark:border-gray-600">
                  {g.year}
                </th>
              ))}
            </tr>
            {/* Month row */}
            <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {tableMonths.map((m, mi) => (
                <th key={m} className={`px-3 py-1.5 text-center font-semibold whitespace-nowrap ${yearBoundaryIndices.has(mi) ? 'border-l border-gray-200 dark:border-gray-600' : ''}`}>
                  {m.slice(5, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INDICATORS.map((ind) => {
              const selIdx = selectedIds.indexOf(ind.id);
              const isSelected = selIdx !== -1;
              const rowHighlight = isSelected ? SELECTION_COLORS[selIdx] : '';
              return (
                <tr
                  key={ind.id}
                  className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/50 ${rowHighlight}`}
                  onClick={() => toggleIndicator(ind.id)}
                >
                  <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {ind.name} <span className="font-normal text-gray-400 dark:text-gray-500">({ind.unit})</span>
                  </td>
                  {ind.data.slice(-TABLE_MONTHS).map((d, di) => {
                    const yearBorder = yearBoundaryIndices.has(di) ? 'border-l border-gray-200 dark:border-gray-600' : '';
                    return (
                      <td key={d.month} className={`px-3 py-2.5 text-center tabular-nums text-gray-700 dark:text-gray-300 ${yearBorder}`}>
                        {d.value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          단위: <span className="font-semibold text-gray-700 dark:text-gray-300">USD ($)</span>
          <span className="ml-3 text-gray-400 dark:text-gray-500">| 행을 클릭하여 최대 3개 선택 (차트에 동시 표시)</span>
        </div>
      </div>

      {/* Chart */}
      {selectedIndicators.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {selectedIndicators.map((ind, idx) => (
                <span
                  key={ind.id}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer hover:opacity-70"
                  onClick={() => toggleIndicator(ind.id)}
                  title="클릭하여 선택 해제"
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[idx] }}
                  />
                  {ind.name}
                  <span className="font-normal text-gray-400 dark:text-gray-500">({ind.unit})</span>
                  <span className="ml-0.5 text-gray-300 text-xs">✕</span>
                  {idx < selectedIndicators.length - 1 && <span className="text-gray-300">|</span>}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.value}
                  onClick={() => setTimeRange(tr.value)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    timeRange === tr.value
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
          <CorrelationBadges correlations={correlations} isDark={isDark} />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                domain={leftDomain}
                label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: tickFill }}
              />
              {filteredOverlay.length > 0 && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false}
                  domain={overlayDomain}
                  tickFormatter={formatOverlayValue}
                  label={{ value: '내부 데이터', angle: 90, position: 'insideRight', offset: 10, fontSize: 10, fill: tickFill }}
                />
              )}
              <Tooltip
                formatter={(value: number | undefined, name?: string) => {
                  const v = value ?? 0;
                  const n = name ?? '';
                  if (n.startsWith('overlay_') || n.includes('(내부)')) {
                    return [formatOverlayValue(v), n.replace('overlay_', '').replace(' (내부)', '') + ' (내부)'];
                  }
                  return [`$${v.toFixed(2)}`, n];
                }}
                contentStyle={{
                  fontSize: 11, borderRadius: 8,
                  border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                  color: isDark ? '#e5e7eb' : '#1f2937',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {selectedIndicators.map((ind, i) => (
                <Line
                  key={ind.id}
                  yAxisId="left"
                  type="monotone"
                  dataKey={ind.id}
                  name={ind.name}
                  stroke={CHART_COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: CHART_COLORS[i] }}
                  activeDot={{ r: 4 }}
                />
              ))}
              {filteredOverlay.map((ol) => (
                <Line
                  key={`overlay_${ol.name}`}
                  yAxisId="right"
                  type="monotone"
                  dataKey={`overlay_${ol.name}`}
                  name={`${ol.name} (내부)`}
                  stroke={ol.color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 2, fill: ol.color }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
