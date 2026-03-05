'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { MonthlyMetricData } from '@/types/v3';
import { useDarkMode } from '@/hooks/useDarkMode';

export type MetricKey = 'waferInput' | 'purchaseVolume' | 'inventoryMonths' | 'capa' | 'utilization';

interface Props {
  data: MonthlyMetricData[];
  prevVersionData?: MonthlyMetricData[];
  versionLabel?: string;
  prevVersionLabel?: string;
  customerType?: 'memory' | 'foundry';
  quarterRange: 4 | 8 | 12;
  onQuarterRangeChange: (range: 4 | 8 | 12) => void;
}

const LIGHT_COLORS: Record<string, string> = {
  waferInput: '#93C5FD',
  purchaseVolume: '#6EE7B7',
  capa: '#C4B5FD',
};

const BAR_METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: 'waferInput', label: '투입량', color: '#3B82F6', unit: 'Km²' },
  { key: 'purchaseVolume', label: '구매량', color: '#10B981', unit: 'Km²' },
  { key: 'capa', label: 'Capa', color: '#8B5CF6', unit: 'Km²' },
];

const LINE_METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: 'inventoryMonths', label: '재고수준', color: '#F59E0B', unit: '개월' },
  { key: 'utilization', label: '가동률', color: '#EF4444', unit: '%' },
];

const ALL_METRICS = [...BAR_METRICS, ...LINE_METRICS];

/** Only these metrics get DRAM/NAND split (구매량/재고수준 excluded) */
const SPLITTABLE_KEYS = new Set<MetricKey>(['waferInput', 'capa', 'utilization']);

type QuarterRange = 4 | 8 | 12;
type TimeGranularity = 'monthly' | 'quarterly' | 'yearly';

const TIME_PRESETS: { value: QuarterRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

function aggregateQuarterly(data: MonthlyMetricData[]): MonthlyMetricData[] {
  const result: MonthlyMetricData[] = [];
  for (let i = 0; i < data.length; i += 3) {
    const chunk = data.slice(i, i + 3);
    if (chunk.length === 0) continue;
    const label = chunk[0].month;
    const sum = (key: keyof MonthlyMetricData) =>
      chunk.reduce((acc, d) => acc + ((d[key] as number) ?? 0), 0);
    const avg = (key: keyof MonthlyMetricData) => +(sum(key) / chunk.length).toFixed(1);
    const hasDramRatio = chunk[0].dramRatio !== undefined;
    result.push({
      month: label,
      waferInput: +(sum('waferInput')).toFixed(1),
      purchaseVolume: +(sum('purchaseVolume')).toFixed(1),
      inventoryMonths: avg('inventoryMonths'),
      utilization: avg('utilization'),
      inventoryLevel: avg('inventoryLevel'),
      capa: +(sum('capa')).toFixed(1),
      ...(hasDramRatio ? { dramRatio: +((chunk.reduce((a, d) => a + (d.dramRatio ?? 0), 0)) / chunk.length).toFixed(3) } : {}),
    });
  }
  return result;
}

function aggregateYearly(data: MonthlyMetricData[]): MonthlyMetricData[] {
  const map: Record<string, MonthlyMetricData[]> = {};
  for (const d of data) {
    const year = d.month.split('.')[0];
    if (!map[year]) map[year] = [];
    map[year].push(d);
  }
  return Object.entries(map).map(([year, chunk]) => {
    const sum = (key: keyof MonthlyMetricData) =>
      chunk.reduce((acc, d) => acc + ((d[key] as number) ?? 0), 0);
    const avg = (key: keyof MonthlyMetricData) => +(sum(key) / chunk.length).toFixed(1);
    const hasDramRatio = chunk[0].dramRatio !== undefined;
    return {
      month: `20${year}`,
      waferInput: +(sum('waferInput')).toFixed(1),
      purchaseVolume: +(sum('purchaseVolume')).toFixed(1),
      inventoryMonths: avg('inventoryMonths'),
      utilization: avg('utilization'),
      inventoryLevel: avg('inventoryLevel'),
      capa: +(sum('capa')).toFixed(1),
      ...(hasDramRatio ? { dramRatio: +((chunk.reduce((a, d) => a + (d.dramRatio ?? 0), 0)) / chunk.length).toFixed(3) } : {}),
    };
  });
}

function getYear(month: string): string {
  if (month.length === 4 && month.startsWith('20')) return month;
  return `20${month.split('.')[0]}`;
}

function getDisplayLabel(month: string, gran: TimeGranularity): string {
  if (gran === 'yearly') return month;
  const parts = month.split('.');
  if (parts.length < 2) return month;
  const m = parseInt(parts[1]);
  if (gran === 'quarterly') {
    const q = Math.ceil(m / 3);
    return `${q}Q`;
  }
  return `${m}월`;
}

/** Compute period-over-period growth rate */
function computeGrowth(arr: MonthlyMetricData[], key: MetricKey, idx: number, offset: number): number | null {
  if (offset <= 0 || idx - offset < 0) return null;
  const curr = arr[idx][key] as number;
  const prev = arr[idx - offset][key] as number;
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function formatGrowth(v: number | null): { text: string; color: string } {
  if (v === null) return { text: '-', color: 'text-gray-300 dark:text-gray-600' };
  const sign = v > 0 ? '+' : '';
  return {
    text: `${sign}${v.toFixed(1)}%`,
    color: v > 0 ? 'text-red-500' : v < 0 ? 'text-blue-500' : 'text-gray-400',
  };
}

export default function MonthlyMetricsChart({
  data,
  prevVersionData,
  versionLabel = '최신 집계',
  prevVersionLabel = '이전 집계',
  customerType,
  quarterRange,
  onQuarterRangeChange,
}: Props) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'waferInput', 'inventoryMonths',
  ]);
  const [granularity, setGranularity] = useState<TimeGranularity>('quarterly');
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [waferFilter, setWaferFilter] = useState<'all' | 'dram' | 'nand'>('all');

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  // Aggregate data — center around current month
  const monthCount = quarterRange * 3;
  const currentMonthSliceIdx = useMemo(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const target = `${yy}.${mm}`;
    const idx = data.findIndex((d) => d.month >= target);
    return idx >= 0 ? idx : data.length - 1;
  }, [data]);
  const sliceStart = Math.max(0, currentMonthSliceIdx - Math.floor(monthCount / 2));
  const sliceEnd = Math.min(data.length, sliceStart + monthCount);
  const adjustedStart = Math.max(0, sliceEnd - monthCount);
  const sliced = data.slice(adjustedStart, sliceEnd);
  const aggregated =
    granularity === 'quarterly'
      ? aggregateQuarterly(sliced)
      : granularity === 'yearly'
        ? aggregateYearly(sliced)
        : sliced;

  // Prev version aggregation
  const prevSliced = prevVersionData?.slice(adjustedStart, sliceEnd);
  const prevAggregated = prevSliced
    ? (granularity === 'quarterly' ? aggregateQuarterly(prevSliced) : granularity === 'yearly' ? aggregateYearly(prevSliced) : prevSliced)
    : null;

  const enrichedData = useMemo(
    () =>
      aggregated.map((d) => {
        const derivedUtilization = d.capa > 0 ? +((d.waferInput / d.capa) * 100).toFixed(1) : d.utilization;
        return { ...d, utilization: derivedUtilization };
      }),
    [aggregated],
  );

  const prevEnrichedData = useMemo(
    () =>
      prevAggregated?.map((d) => {
        const derivedUtilization = d.capa > 0 ? +((d.waferInput / d.capa) * 100).toFixed(1) : d.utilization;
        return { ...d, utilization: derivedUtilization };
      }) ?? null,
    [prevAggregated],
  );

  const isMemory = customerType === 'memory';
  const hasDramRatio = enrichedData.some(d => d.dramRatio !== undefined);
  const canSplit = isMemory && hasDramRatio && waferFilter === 'all';
  const canFilter = isMemory && hasDramRatio;
  const hasVersionData = !!prevVersionData && prevVersionData.length > 0;

  // Apply DRAM/NAND filter to data (for 'dram' or 'nand' selections)
  const filteredEnrichedData = useMemo(() => {
    if (!canFilter || waferFilter === 'all') return enrichedData;
    return enrichedData.map((d) => {
      if (d.dramRatio === undefined) return d;
      const r = waferFilter === 'dram' ? d.dramRatio : (1 - d.dramRatio);
      const filtered = { ...d };
      for (const key of SPLITTABLE_KEYS) {
        (filtered as Record<string, unknown>)[key] = +((d[key] as number) * r).toFixed(1);
      }
      return filtered;
    });
  }, [enrichedData, canFilter, waferFilter]);

  // Chart data with split and version fields
  const chartData = useMemo(() => {
    const sourceData = waferFilter === 'all' ? enrichedData : filteredEnrichedData;
    return sourceData.map((d, i) => {
      const entry: Record<string, unknown> = { ...d };

      // DRAM/NAND split fields (only splittable bar metrics)
      if (canSplit && d.dramRatio !== undefined) {
        const r = d.dramRatio;
        for (const m of BAR_METRICS) {
          if (!SPLITTABLE_KEYS.has(m.key)) continue;
          const val = d[m.key] as number;
          entry[`dram_${m.key}`] = +(val * r).toFixed(1);
          entry[`nand_${m.key}`] = +(val * (1 - r)).toFixed(1);
        }
      }

      // Previous version fields
      if (showVersionCompare && prevEnrichedData && prevEnrichedData[i]) {
        const prev = prevEnrichedData[i];
        for (const m of ALL_METRICS) {
          entry[`prev_${m.key}`] = prev[m.key];
        }
      }

      return entry;
    });
  }, [enrichedData, filteredEnrichedData, prevEnrichedData, canSplit, showVersionCompare, waferFilter]);

  // Dynamic "현재" marker based on actual current date
  const currentMarkerMonth = useMemo(() => {
    if (enrichedData.length === 0) return undefined;
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    let target: string;
    if (granularity === 'yearly') {
      target = `20${yy}`;
    } else if (granularity === 'quarterly') {
      const lastMonthOfQ = Math.ceil((now.getMonth() + 1) / 3) * 3;
      target = `${yy}.${String(lastMonthOfQ).padStart(2, '0')}`;
    } else {
      target = `${yy}.${mm}`;
    }

    let best: string | undefined;
    for (const d of enrichedData) {
      if (d.month <= target) best = d.month;
    }
    return best ?? enrichedData[enrichedData.length - 1]?.month;
  }, [enrichedData, granularity]);

  const activeBarMetrics = BAR_METRICS.filter((m) => selectedMetrics.includes(m.key));
  const activeLineMetrics = LINE_METRICS.filter((m) => selectedMetrics.includes(m.key));
  const activeMetrics = ALL_METRICS.filter((m) => selectedMetrics.includes(m.key));

  // Display data for table — uses filtered data when DRAM/NAND filter active
  const displayData = waferFilter === 'all' ? enrichedData : filteredEnrichedData;

  // Year groups for table header merging
  const yearGroups = useMemo(() => {
    const groups: { year: string; entries: MonthlyMetricData[] }[] = [];
    enrichedData.forEach((d) => {
      const yr = getYear(d.month);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) {
        last.entries.push(d);
      } else {
        groups.push({ year: yr, entries: [d] });
      }
    });
    return groups;
  }, [enrichedData]);

  // Growth offsets: only show the matching rate per granularity
  const growthOffsets = useMemo(() => {
    switch (granularity) {
      case 'monthly': return { mom: 1, qoq: 0, yoy: 0 };
      case 'quarterly': return { mom: 0, qoq: 1, yoy: 0 };
      case 'yearly': return { mom: 0, qoq: 0, yoy: 1 };
    }
  }, [granularity]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
          Wafer 주요 지표 Chart
        </h3>
        {hasVersionData && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVersionCompare(!showVersionCompare)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                showVersionCompare
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              전월조사 비교
            </button>
            {showVersionCompare && (
              <span className="text-[10px] text-gray-400">
                <span className="font-semibold text-gray-600 dark:text-gray-300">{versionLabel}</span>
                {' vs '}
                <span className="font-semibold text-orange-400">{prevVersionLabel}</span>
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1">
          {ALL_METRICS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleMetric(opt.key)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                selectedMetrics.includes(opt.key)
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
              }`}
              style={selectedMetrics.includes(opt.key) ? { backgroundColor: opt.color } : undefined}
            >
              {opt.label}
            </button>
          ))}

          {/* Period selector */}
          <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-600">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onQuarterRangeChange(preset.value)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  quarterRange === preset.value
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Granularity toggle */}
          <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-600">
            {([
              { key: 'monthly', label: '월별' },
              { key: 'quarterly', label: '분기별' },
              { key: 'yearly', label: '년도별' },
            ] as { key: TimeGranularity; label: string }[]).map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  granularity === g.key
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* DRAM/NAND filter */}
          {canFilter && (
            <div className="flex items-center gap-1 border-l border-gray-200 pl-2 dark:border-gray-600">
              {(['all', 'dram', 'nand'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setWaferFilter(f)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    waferFilter === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {f === 'all' ? 'ALL' : f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: tickFill }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: tickFill }}
            axisLine={false}
            tickLine={false}
          />
          {activeLineMetrics.length > 0 && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip
            contentStyle={
              isDark
                ? { fontSize: 12, borderRadius: 8, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
                : { fontSize: 12, backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: 8 }
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* 현재 marker */}
          {currentMarkerMonth && (
            <ReferenceLine
              yAxisId="left"
              x={currentMarkerMonth}
              stroke={isDark ? '#fbbf24' : '#dc2626'}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                const x = viewBox?.x ?? 0;
                return (
                  <g>
                    <rect
                      x={x - 18}
                      y={2}
                      width={36}
                      height={16}
                      rx={4}
                      fill={isDark ? '#1e293b' : '#fff'}
                      stroke={isDark ? '#fbbf24' : '#dc2626'}
                      strokeWidth={1.2}
                    />
                    <text
                      x={x}
                      y={14}
                      textAnchor="middle"
                      fontSize={10}
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

          {/* Previous version bars (behind current, lighter) */}
          {showVersionCompare && activeBarMetrics.map((opt) => (
            <Bar
              key={`prev_${opt.key}`}
              yAxisId="left"
              dataKey={`prev_${opt.key}`}
              name={`${prevVersionLabel} ${opt.label}`}
              fill={opt.color}
              opacity={0.25}
              barSize={12}
              radius={[2, 2, 0, 0]}
            />
          ))}

          {/* Bar metrics — split only for splittable metrics */}
          {activeBarMetrics.map((opt) => {
            const isSplittable = canSplit && SPLITTABLE_KEYS.has(opt.key);
            if (isSplittable) {
              return (
                <Fragment key={opt.key}>
                  <Bar
                    stackId={opt.key}
                    yAxisId="left"
                    dataKey={`dram_${opt.key}`}
                    name={`DRAM ${opt.label}`}
                    fill={opt.color}
                    opacity={0.9}
                    barSize={16}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    stackId={opt.key}
                    yAxisId="left"
                    dataKey={`nand_${opt.key}`}
                    name={`NAND ${opt.label}`}
                    fill={LIGHT_COLORS[opt.key] ?? opt.color}
                    opacity={0.9}
                    barSize={16}
                    radius={[2, 2, 0, 0]}
                  />
                </Fragment>
              );
            }
            return (
              <Bar
                key={opt.key}
                yAxisId="left"
                dataKey={opt.key}
                name={`${opt.label} (${opt.unit})`}
                fill={opt.color}
                opacity={0.8}
                barSize={16}
                radius={[2, 2, 0, 0]}
              />
            );
          })}

          {/* Previous version lines (dashed) */}
          {showVersionCompare && activeLineMetrics.map((opt) => (
            <Line
              key={`prev_${opt.key}`}
              yAxisId="right"
              type="monotone"
              dataKey={`prev_${opt.key}`}
              name={`${prevVersionLabel} ${opt.label}`}
              stroke={opt.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              opacity={0.4}
            />
          ))}

          {/* Line metrics */}
          {activeLineMetrics.map((opt) => (
            <Line
              key={opt.key}
              yAxisId="right"
              type="monotone"
              dataKey={opt.key}
              name={`${opt.label} (${opt.unit})`}
              stroke={opt.color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: opt.color }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {selectedMetrics.includes('utilization') && (
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          * 가동률 = 투입량 / Capa x 100 으로 자동 계산
        </p>
      )}

      {/* Data table with MoM/QoQ/YoY sub-rows */}
      {displayData.length > 0 && activeMetrics.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Year row */}
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
                    colSpan={g.entries.length}
                    className="text-center px-1 py-1 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap"
                  >
                    {g.year}
                  </th>
                ))}
              </tr>
              {/* Month/Quarter row */}
              <tr className="bg-gray-50 dark:bg-gray-600">
                {displayData.map((d) => (
                  <th
                    key={d.month}
                    className="text-center px-1.5 py-1 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300"
                  >
                    {getDisplayLabel(d.month, granularity)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMetrics.map((metric, rowIdx) => {
                return (
                  <Fragment key={metric.key}>
                    {/* Actual value row */}
                    <tr className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td
                        className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600"
                        style={{ color: metric.color }}
                      >
                        {metric.label}
                      </td>
                      {displayData.map((d) => (
                        <td
                          key={d.month}
                          className="px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300"
                        >
                          {(d[metric.key] as number).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      ))}
                    </tr>

                    {/* Previous version row */}
                    {showVersionCompare && prevEnrichedData && (
                      <tr className="bg-orange-50/50 dark:bg-orange-900/10">
                        <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-medium whitespace-nowrap text-orange-400 dark:border-gray-600">
                          {prevVersionLabel}
                        </td>
                        {prevEnrichedData.map((d) => (
                          <td
                            key={d.month}
                            className="px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] text-orange-400 dark:border-gray-600"
                          >
                            {(d[metric.key] as number).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Difference row (current - previous) */}
                    {showVersionCompare && prevEnrichedData && (
                      <tr className="bg-yellow-50/50 dark:bg-yellow-900/10">
                        <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-medium whitespace-nowrap text-amber-600 dark:border-gray-600 dark:text-amber-400">
                          차이
                        </td>
                        {displayData.map((d, i) => {
                          const curr = d[metric.key] as number;
                          const prev = prevEnrichedData[i]?.[metric.key] as number | undefined;
                          if (prev === undefined) return <td key={d.month} className="px-1.5 py-0.5 border border-gray-200 text-right text-[10px] text-gray-300 dark:border-gray-600">-</td>;
                          const diff = curr - prev;
                          const sign = diff > 0 ? '+' : '';
                          const color = diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : 'text-gray-400';
                          return (
                            <td key={d.month} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                              {sign}{diff.toFixed(1)}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* DRAM/NAND split rows */}
                    {canSplit && SPLITTABLE_KEYS.has(metric.key) && (
                      <>
                        <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                          <td
                            className="pl-4 pr-2 py-0.5 border border-gray-200 text-[10px] font-medium whitespace-nowrap dark:border-gray-600"
                            style={{ color: metric.color }}
                          >
                            DRAM
                          </td>
                          {displayData.map((d) => {
                            const ratio = d.dramRatio ?? 0.5;
                            const val = (d[metric.key] as number) * ratio;
                            return (
                              <td key={d.month} className="px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                                {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="bg-purple-50/30 dark:bg-purple-900/10">
                          <td
                            className="pl-4 pr-2 py-0.5 border border-gray-200 text-[10px] font-medium whitespace-nowrap dark:border-gray-600"
                            style={{ color: LIGHT_COLORS[metric.key] ?? metric.color }}
                          >
                            NAND
                          </td>
                          {displayData.map((d) => {
                            const ratio = d.dramRatio ?? 0.5;
                            const val = (d[metric.key] as number) * (1 - ratio);
                            return (
                              <td key={d.month} className="px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                                {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    )}

                    {/* MoM row */}
                    {growthOffsets.mom > 0 && (
                      <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                        <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">
                          MoM
                        </td>
                        {displayData.map((d, i) => {
                          const g = computeGrowth(displayData, metric.key, i, growthOffsets.mom);
                          const { text, color } = formatGrowth(g);
                          return (
                            <td key={d.month} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* QoQ row */}
                    {growthOffsets.qoq > 0 && (
                      <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                        <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">
                          QoQ
                        </td>
                        {displayData.map((d, i) => {
                          const g = computeGrowth(displayData, metric.key, i, growthOffsets.qoq);
                          const { text, color } = formatGrowth(g);
                          return (
                            <td key={d.month} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* YoY row */}
                    {growthOffsets.yoy > 0 && (
                      <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                        <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">
                          YoY
                        </td>
                        {displayData.map((d, i) => {
                          const g = computeGrowth(displayData, metric.key, i, growthOffsets.yoy);
                          const { text, color } = formatGrowth(g);
                          return (
                            <td key={d.month} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
