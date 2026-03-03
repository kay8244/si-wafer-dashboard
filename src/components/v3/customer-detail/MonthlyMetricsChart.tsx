'use client';

import { useState, useMemo } from 'react';
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
  quarterRange: 4 | 8 | 12;
  onQuarterRangeChange: (range: 4 | 8 | 12) => void;
}

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
      chunk.reduce((acc, d) => acc + (d[key] as number), 0);
    const avg = (key: keyof MonthlyMetricData) => +(sum(key) / chunk.length).toFixed(1);
    result.push({
      month: label,
      waferInput: +(sum('waferInput')).toFixed(1),
      purchaseVolume: +(sum('purchaseVolume')).toFixed(1),
      inventoryMonths: avg('inventoryMonths'),
      utilization: avg('utilization'),
      inventoryLevel: avg('inventoryLevel'),
      capa: +(sum('capa')).toFixed(1),
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
      chunk.reduce((acc, d) => acc + (d[key] as number), 0);
    const avg = (key: keyof MonthlyMetricData) => +(sum(key) / chunk.length).toFixed(1);
    return {
      month: `20${year}`,
      waferInput: +(sum('waferInput')).toFixed(1),
      purchaseVolume: +(sum('purchaseVolume')).toFixed(1),
      inventoryMonths: avg('inventoryMonths'),
      utilization: avg('utilization'),
      inventoryLevel: avg('inventoryLevel'),
      capa: +(sum('capa')).toFixed(1),
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

export default function MonthlyMetricsChart({ data, quarterRange, onQuarterRangeChange }: Props) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'waferInput', 'inventoryMonths',
  ]);
  const [granularity, setGranularity] = useState<TimeGranularity>('monthly');

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  // 4Q = 12 months, 8Q = 24 months, 12Q = 36 months
  const monthCount = quarterRange * 3;
  const sliced = data.slice(-Math.min(monthCount, data.length));

  const aggregated =
    granularity === 'quarterly'
      ? aggregateQuarterly(sliced)
      : granularity === 'yearly'
        ? aggregateYearly(sliced)
        : sliced;

  const enrichedData = useMemo(
    () =>
      aggregated.map((d) => {
        const derivedUtilization = d.capa > 0 ? +((d.waferInput / d.capa) * 100).toFixed(1) : d.utilization;
        return { ...d, utilization: derivedUtilization };
      }),
    [aggregated],
  );

  // "현재" marker: 1 quarter before end (last 3 months = future estimate quarter)
  const currentIdx = enrichedData.length > 0
    ? (granularity === 'monthly'
      ? Math.max(0, enrichedData.length - 4)   // 3 months from end
      : Math.max(0, enrichedData.length - 2))   // 1 entry from end in quarterly/yearly
    : -1;
  const currentMonth = currentIdx >= 0 ? enrichedData[currentIdx]?.month : undefined;

  const activeBarMetrics = BAR_METRICS.filter((m) => selectedMetrics.includes(m.key));
  const activeLineMetrics = LINE_METRICS.filter((m) => selectedMetrics.includes(m.key));
  const activeMetrics = ALL_METRICS.filter((m) => selectedMetrics.includes(m.key));

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
          Wafer 주요 지표 Chart
        </h3>
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

          {/* Period selector — 4Q/8Q/12Q */}
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
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={enrichedData} margin={{ top: 20, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: tickFill }}
            axisLine={false}
            tickLine={false}
          />
          {/* Left Y-axis for bar metrics (Km²) */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: tickFill }}
            axisLine={false}
            tickLine={false}
          />
          {/* Right Y-axis for line metrics (% / 개월) */}
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
          {currentMonth && (
            <ReferenceLine
              yAxisId="left"
              x={currentMonth}
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

          {/* Bar metrics — left Y axis */}
          {activeBarMetrics.map((opt) => (
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
          ))}

          {/* Line metrics — right Y axis */}
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

      {/* Data table — syncs with chart (year-merged headers) */}
      {enrichedData.length > 0 && activeMetrics.length > 0 && (
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
                    colSpan={g.entries.length}
                    className="text-center px-1 py-1 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap"
                  >
                    {g.year}
                  </th>
                ))}
              </tr>
              {/* Month/Quarter row */}
              <tr className="bg-gray-50 dark:bg-gray-600">
                {enrichedData.map((d) => (
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
              {activeMetrics.map((metric, rowIdx) => (
                <tr
                  key={metric.key}
                  className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}
                >
                  <td
                    className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600"
                    style={{ color: metric.color }}
                  >
                    {metric.label}
                  </td>
                  {enrichedData.map((d) => (
                    <td
                      key={d.month}
                      className="px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300"
                    >
                      {(d[metric.key] as number).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
