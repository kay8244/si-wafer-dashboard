'use client';

import { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { SupplyChainCategory, ViewMode, LeadingIndicatorRating } from '@/types/v3';
import { useDarkMode } from '@/hooks/useDarkMode';

function leadingRatingBadge(r: LeadingIndicatorRating): { bg: string; text: string } {
  switch (r) {
    case '상': return { bg: 'bg-green-100', text: 'text-green-800' };
    case '중상': return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case '중': return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case '중하': return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case '하': return { bg: 'bg-red-100', text: 'text-red-800' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
}

type TimeRange = 6 | 12 | 24 | 36;
const TIME_RANGES: TimeRange[] = [6, 12, 24, 36];

interface OverlayLine {
  name: string;
  data: { month: string; value: number }[];
  color: string;
}

interface IndicatorChartProps {
  category: SupplyChainCategory;
  selectedIndicatorId: string | null;
  overlayData?: OverlayLine[];
  viewMode?: ViewMode;
}

const INDICATOR_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#db2777'];

/** Map viewMode to a display label and line color */
const VIEW_MODE_LINE: Record<ViewMode, { label: string; color: string }> = {
  actual: { label: 'Actual', color: '#2563eb' },
  threeMonthMA: { label: '3MMA', color: '#16a34a' },
  twelveMonthMA: { label: '12MMA', color: '#d97706' },
  mom: { label: 'MoM', color: '#dc2626' },
  yoy: { label: 'YoY', color: '#7c3aed' },
};

function getFieldValue(
  m: { actual: number; threeMonthMA: number; twelveMonthMA: number; mom: number; yoy: number },
  viewMode: ViewMode,
): number {
  switch (viewMode) {
    case 'actual': return m.actual;
    case 'threeMonthMA': return m.threeMonthMA;
    case 'twelveMonthMA': return m.twelveMonthMA;
    case 'mom': return m.mom;
    case 'yoy': return m.yoy;
  }
}

/** Compute a tight [min, max] domain with ~15% padding so variation is clearly visible */
function tightDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) {
    // Flat line — show ±10% of the value
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const padding = range * 0.15;
  const lo = min - padding;
  return [lo < 0 && min >= 0 ? 0 : lo, max + padding];
}

/** Format Y-axis values compactly */
function formatYValue(value: number): string {
  if (Math.abs(value) >= 10000) return `${(value / 1000).toFixed(0)}K`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

export default function IndicatorChart({
  category,
  selectedIndicatorId,
  overlayData,
  viewMode = 'actual',
}: IndicatorChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(6);
  const [editingJudgment, setEditingJudgment] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const { isDark } = useDarkMode();

  const getJudgment = useCallback((id: string, original: string) => {
    return editingJudgment[id] ?? original;
  }, [editingJudgment]);

  const startEdit = useCallback((id: string, current: string) => {
    setEditingId(id);
    setEditingJudgment((prev) => ({ ...prev, [id]: prev[id] ?? current }));
  }, []);

  const finishEdit = useCallback(() => {
    setEditingId(null);
  }, []);
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const tickColor = isDark ? '#94a3b8' : undefined;
  const tooltipBg = isDark ? { fontSize: 14, borderRadius: 8, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' } : { fontSize: 14, borderRadius: 8 };
  const hasOverlay = overlayData && overlayData.length > 0;

  // Determine which indicators to show
  const indicators =
    selectedIndicatorId !== null
      ? category.indicators.filter((ind) => ind.id === selectedIndicatorId)
      : category.indicators;

  // XAxis interval: 12M→0 (all), 24M→1 (every other), 36M→2 (every 3rd)
  const xAxisInterval = Math.max(0, Math.floor(timeRange / 12) - 1);
  const xTickFontSize = timeRange <= 12 ? 14 : 12;
  const showValueLabels = timeRange <= 12;

  // Time range selector component
  const TimeRangeSelector = (
    <div className="flex items-center gap-1 overflow-hidden rounded-lg border border-gray-200 text-xs">
      {TIME_RANGES.map((range) => (
        <button
          key={range}
          onClick={() => setTimeRange(range)}
          className={`px-3 py-1.5 font-semibold transition-colors ${
            timeRange === range
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {range}M
        </button>
      ))}
    </div>
  );

  // ── Single indicator selected ──
  if (selectedIndicatorId !== null && indicators.length > 0) {
    const ind = indicators[0];
    const vmLine = VIEW_MODE_LINE[viewMode];
    const slicedMonthly = ind.monthly.slice(-timeRange);

    const chartData = slicedMonthly.map((m) => {
      const entry: Record<string, string | number> = {
        month: m.month.slice(2).replace('-', '.'),
        [vmLine.label]: getFieldValue(m, viewMode),
      };
      if (overlayData) {
        overlayData.forEach((ol) => {
          const point = ol.data.find((d) => d.month === m.month);
          entry[ol.name] = point?.value ?? 0;
        });
      }
      return entry;
    });

    // Left Y domain — tight scale around sliced viewMode values
    const allLeftValues = slicedMonthly.map((m) => getFieldValue(m, viewMode));
    const leftDomain = tightDomain(allLeftValues);

    // Right Y domain — tight scale around overlay values (filtered to time range)
    const slicedMonths = new Set(slicedMonthly.map((m) => m.month));
    const allRightValues = overlayData?.flatMap((ol) => ol.data.filter((d) => slicedMonths.has(d.month)).map((d) => d.value)) ?? [];
    const rightDomain = tightDomain(allRightValues);

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
        {/* Title + Time Range Selector */}
        <div className="mb-1 flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white">
                {ind.id}
              </span>
              {ind.leadingRating && (() => {
                const badge = leadingRatingBadge(ind.leadingRating);
                return (
                  <span className={`inline-block rounded-md px-2 py-0.5 text-sm font-bold ${badge.bg} ${badge.text}`}>
                    {ind.leadingRating}
                  </span>
                );
              })()}
              {ind.name}
              <span className="text-sm font-normal text-gray-400">({ind.unit}) — {vmLine.label}</span>
              {hasOverlay && (
                <span className="text-sm font-normal text-gray-400">| 오른쪽 축: 내부 데이터</span>
              )}
            </p>
          </div>
          {TimeRangeSelector}
        </div>
        {/* Judgment banner — editable */}
        {(() => {
          const judgmentText = getJudgment(ind.id, ind.judgment ?? '');
          const isEditing = editingId === ind.id;
          return (
            <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <span className="mr-1.5 font-semibold text-blue-600 dark:text-blue-400">판단:</span>
              {isEditing ? (
                <textarea
                  className="mt-1 w-full rounded border border-blue-300 bg-white px-2 py-1.5 text-sm text-gray-800 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-blue-600 dark:bg-gray-700 dark:text-gray-200"
                  rows={2}
                  value={editingJudgment[ind.id] ?? judgmentText}
                  onChange={(e) => setEditingJudgment((prev) => ({ ...prev, [ind.id]: e.target.value }))}
                  onBlur={finishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      finishEdit();
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span
                  className="cursor-pointer rounded px-1 -mx-1 hover:bg-blue-100/60 dark:hover:bg-blue-800/40 transition-colors"
                  onClick={() => startEdit(ind.id, judgmentText)}
                  title="클릭하여 수정"
                >
                  {judgmentText || <span className="italic text-gray-400">판단을 입력하세요</span>}
                </span>
              )}
            </div>
          );
        })()}
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 20, right: hasOverlay ? 16 : 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" tick={{ fontSize: xTickFontSize, fill: tickColor }} interval={xAxisInterval} />
            {/* Left Y — single viewMode line with tight domain */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 14, fill: tickColor }}
              width={65}
              domain={leftDomain}
              tickFormatter={formatYValue}
              stroke="#6b7280"
            />
            {/* Right Y — overlay data (only when overlay exists) */}
            {hasOverlay && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 14, fill: tickColor }}
                width={65}
                domain={rightDomain}
                tickFormatter={formatYValue}
                stroke="#9ca3af"
              />
            )}
            <Tooltip contentStyle={tooltipBg} />
            <Legend wrapperStyle={{ fontSize: 14 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={vmLine.label}
              stroke={vmLine.color}
              strokeWidth={2}
              dot={{ r: timeRange <= 12 ? 3 : 2 }}
            >
              {showValueLabels && (
                <LabelList
                  dataKey={vmLine.label}
                  position="top"
                  formatter={(v: unknown) => formatYValue(Number(v))}
                  style={{ fontSize: 12, fill: vmLine.color, fontWeight: 600 }}
                />
              )}
            </Line>
            {overlayData?.map((ol) => (
              <Line
                key={ol.name}
                yAxisId="right"
                type="monotone"
                dataKey={ol.name}
                stroke={ol.color}
                strokeWidth={2}
                dot={{ r: timeRange <= 12 ? 3 : 2, fill: ol.color }}
                strokeDasharray="6 3"
              >
                {showValueLabels && (
                  <LabelList
                    dataKey={ol.name}
                    position="bottom"
                    formatter={(v: unknown) => formatYValue(Number(v))}
                    style={{ fontSize: 10, fill: ol.color, fontWeight: 600 }}
                  />
                )}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── No selection — show all indicators (sliced to timeRange) ──
  const allMonths = category.indicators[0]?.monthly.map((m) => m.month) ?? [];
  const months = allMonths.slice(-timeRange);
  const offset = allMonths.length - timeRange;
  const chartData = months.map((month, i) => {
    const entry: Record<string, string | number> = { month: month.slice(2).replace('-', '.') };
    category.indicators.forEach((ind) => {
      const m = ind.monthly[offset + i];
      entry[ind.name] = m ? getFieldValue(m, viewMode) : 0;
    });
    if (overlayData) {
      overlayData.forEach((ol) => {
        const point = ol.data.find((d) => d.month === month);
        entry[ol.name] = point?.value ?? 0;
      });
    }
    return entry;
  });

  // Left Y domain — all indicator values (sliced)
  const allLeftValues = category.indicators.flatMap((ind) =>
    ind.monthly.slice(-timeRange).map((m) => getFieldValue(m, viewMode)),
  );
  const leftDomain = tightDomain(allLeftValues);

  // Right Y domain — overlay values (filtered to time range)
  const monthSet = new Set(months);
  const allRightValues = overlayData?.flatMap((ol) => ol.data.filter((d) => monthSet.has(d.month)).map((d) => d.value)) ?? [];
  const rightDomain = tightDomain(allRightValues);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-lg font-bold text-gray-800">
          All Indicators —{' '}
          {viewMode === 'actual'
            ? 'Actual'
            : viewMode === 'threeMonthMA'
              ? '3MMA'
              : viewMode === 'twelveMonthMA'
                ? '12MMA'
                : viewMode.toUpperCase()}
          <span className="ml-2 text-sm font-normal text-gray-400">(행을 클릭하면 개별 지표를 볼 수 있습니다)</span>
          {hasOverlay && (
            <span className="ml-3 text-sm font-normal text-gray-400">| 오른쪽 축: 내부 데이터</span>
          )}
        </p>
        {TimeRangeSelector}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 20, right: hasOverlay ? 16 : 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fontSize: 14, fill: tickColor }} />
          {/* Left Y — indicator data */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 14, fill: tickColor }}
            width={65}
            domain={leftDomain}
            tickFormatter={formatYValue}
            stroke="#6b7280"
          />
          {/* Right Y — overlay data */}
          {hasOverlay && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 14, fill: tickColor }}
              width={65}
              domain={rightDomain}
              tickFormatter={formatYValue}
              stroke="#9ca3af"
            />
          )}
          <Tooltip contentStyle={tooltipBg} />
          <Legend wrapperStyle={{ fontSize: 14 }} />
          {category.indicators.map((ind, idx) => (
            <Line
              key={ind.id}
              yAxisId="left"
              type="monotone"
              dataKey={ind.name}
              stroke={INDICATOR_COLORS[idx % INDICATOR_COLORS.length]}
              strokeWidth={1.5}
              dot={{ r: timeRange <= 12 ? 2 : 1 }}
            >
              {showValueLabels && (
                <LabelList
                  dataKey={ind.name}
                  position="top"
                  formatter={(v: unknown) => formatYValue(Number(v))}
                  style={{ fontSize: 10, fill: INDICATOR_COLORS[idx % INDICATOR_COLORS.length], fontWeight: 600 }}
                />
              )}
            </Line>
          ))}
          {overlayData?.map((ol) => (
            <Line
              key={ol.name}
              yAxisId="right"
              type="monotone"
              dataKey={ol.name}
              stroke={ol.color}
              strokeWidth={2}
              dot={{ r: timeRange <= 12 ? 3 : 2, fill: ol.color }}
              strokeDasharray="6 3"
            >
              {showValueLabels && (
                <LabelList
                  dataKey={ol.name}
                  position="bottom"
                  formatter={(v: unknown) => formatYValue(Number(v))}
                  style={{ fontSize: 10, fill: ol.color, fontWeight: 600 }}
                />
              )}
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
