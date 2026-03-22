'use client';

import { useState } from 'react';
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
import { SupplyChainCategory, ViewMode, LeadingIndicatorRating } from '@/types/indicators';
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
  allCategories?: SupplyChainCategory[];
  selectedIndicatorIds: string[];
  onToggleIndicator?: (name: string) => void;
  overlayData?: OverlayLine[];
  viewMode?: ViewMode;
}

// Colors for the 3 selected indicators
const SELECTED_INDICATOR_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

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

/** Pearson correlation coefficient between two numeric arrays of equal length */
function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 3 || n !== y.length) return null;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return num / den;
}

/** Interpret correlation strength */
function corrLabel(r: number): { text: string; color: string } {
  const abs = Math.abs(r);
  if (abs >= 0.8) return { text: '강한', color: r > 0 ? '#dc2626' : '#2563eb' };
  if (abs >= 0.6) return { text: '보통', color: r > 0 ? '#d97706' : '#7c3aed' };
  if (abs >= 0.4) return { text: '약한', color: '#6b7280' };
  return { text: '미약', color: '#9ca3af' };
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
  allCategories,
  selectedIndicatorIds,
  onToggleIndicator,
  overlayData,
  viewMode = 'actual',
}: IndicatorChartProps) {
  // All indicators across all categories for cross-category selection
  const allIndicators = (allCategories ?? [category]).flatMap((c) => c.indicators);
  const [timeRange, setTimeRange] = useState<TimeRange>(12);
  const { isDark } = useDarkMode();

  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const tickColor = isDark ? '#94a3b8' : undefined;
  const tooltipBg = isDark ? { fontSize: 14, borderRadius: 8, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' } : { fontSize: 14, borderRadius: 8 };
  const hasOverlay = overlayData && overlayData.length > 0;

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

  // Determine selected indicators in order (search ALL categories by name)
  const selectedInds = selectedIndicatorIds
    .map((name) => allIndicators.find((ind) => ind.name === name))
    .filter((ind): ind is NonNullable<typeof ind> => ind !== undefined);

  // ── One or more indicators selected ──
  if (selectedInds.length > 0) {
    // Build unified month axis from first indicator
    const refMonthly = selectedInds[0].monthly.slice(-timeRange);
    const refMonths = refMonthly.map((m) => m.month);

    // Build chart data: one row per month, columns per indicator + overlays
    const chartData = refMonths.map((month) => {
      const entry: Record<string, string | number> = {
        month: month.slice(2).replace('-', '.'),
      };
      selectedInds.forEach((ind) => {
        const m = ind.monthly.find((x) => x.month === month);
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

    // Y-axis domains per indicator (independent scales)
    const indDomains = selectedInds.map((ind) => {
      const vals = ind.monthly.slice(-timeRange).map((m) => getFieldValue(m, viewMode));
      return tightDomain(vals);
    });

    // Right Y domain — overlay values
    const monthSet = new Set(refMonths);
    const allRightValues = overlayData?.flatMap((ol) => ol.data.filter((d) => monthSet.has(d.month)).map((d) => d.value)) ?? [];
    const rightDomain = tightDomain(allRightValues);

    // Correlation badges (first indicator vs overlays)
    const correlations: { name: string; r: number; color: string }[] = [];
    if (overlayData && overlayData.length > 0 && selectedInds.length > 0) {
      const extByMonth = new Map(refMonthly.map((m) => [m.month, getFieldValue(m, viewMode)]));
      overlayData.forEach((ol) => {
        const pairs: { x: number; y: number }[] = [];
        ol.data.forEach((d) => {
          const ext = extByMonth.get(d.month);
          if (ext !== undefined) pairs.push({ x: ext, y: d.value });
        });
        const r = pearsonCorrelation(pairs.map((p) => p.x), pairs.map((p) => p.y));
        if (r !== null) correlations.push({ name: ol.name, r, color: ol.color });
      });
    }

    // yAxisId assignment:
    // ind[0] → 'ind0' (left axis rendered)
    // ind[1] → 'ind1' (right axis rendered)
    // ind[2] → 'ind2' (hidden axis — tooltip only)
    // overlays → 'overlay' (right axis when no 2nd indicator, else hidden)
    const getIndAxisId = (idx: number) => `ind${idx}`;
    const overlayAxisId = selectedInds.length <= 1 ? 'overlay' : 'ind1';

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
        {/* Title + Time Range Selector */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {selectedInds.map((ind, idx) => (
              <span
                key={ind.name}
                className={`flex items-center gap-1.5 text-sm font-semibold text-gray-800 ${onToggleIndicator ? 'cursor-pointer hover:opacity-70' : ''}`}
                onClick={() => onToggleIndicator?.(ind.name)}
                title={onToggleIndicator ? '클릭하여 선택 해제' : undefined}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: SELECTED_INDICATOR_COLORS[idx] }}
                />
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white">
                  {ind.id}
                </span>
                {ind.name}
                <span className="font-normal text-gray-400">({ind.unit})</span>
                {onToggleIndicator && <span className="ml-0.5 text-gray-300 text-xs">✕</span>}
                {idx < selectedInds.length - 1 && <span className="text-gray-300">|</span>}
              </span>
            ))}
            {hasOverlay && (
              <span className="text-sm font-normal text-gray-400 ml-1">| 오른쪽 축: 내부 데이터</span>
            )}
          </div>
          {TimeRangeSelector}
        </div>

        <div className="relative">
          {/* Correlation badges */}
          {correlations.length > 0 && (
            <div className="absolute top-7 right-24 z-10 flex flex-col gap-1">
              {correlations.map((c) => {
                const info = corrLabel(c.r);
                return (
                  <div
                    key={c.name}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm"
                    style={{
                      borderColor: c.color + '40',
                      backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.9)',
                    }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span style={{ color: isDark ? '#e2e8f0' : '#374151' }}>{c.name.split(' (')[0]}</span>
                    <span style={{ color: info.color, fontWeight: 700 }}>r={c.r >= 0 ? '+' : ''}{c.r.toFixed(2)}</span>
                    <span style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>({info.text} {c.r >= 0 ? '양' : '음'}의 상관)</span>
                  </div>
                );
              })}
            </div>
          )}

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: xTickFontSize, fill: tickColor }} interval={xAxisInterval} />

              {/* Left Y — first indicator */}
              <YAxis
                yAxisId="ind0"
                tick={{ fontSize: 13, fill: tickColor }}
                width={60}
                domain={indDomains[0]}
                tickFormatter={formatYValue}
                stroke={SELECTED_INDICATOR_COLORS[0]}
              />

              {/* Right Y — second indicator or overlay */}
              {selectedInds.length >= 2 ? (
                <YAxis
                  yAxisId="ind1"
                  orientation="right"
                  tick={{ fontSize: 13, fill: tickColor }}
                  width={60}
                  domain={indDomains[1]}
                  tickFormatter={formatYValue}
                  stroke={SELECTED_INDICATOR_COLORS[1]}
                />
              ) : hasOverlay ? (
                <YAxis
                  yAxisId="overlay"
                  orientation="right"
                  tick={{ fontSize: 13, fill: tickColor }}
                  width={60}
                  domain={rightDomain}
                  tickFormatter={formatYValue}
                  stroke="#9ca3af"
                />
              ) : null}

              {/* Hidden Y axis for 3rd indicator (tooltip only) */}
              {selectedInds.length >= 3 && (
                <YAxis
                  yAxisId="ind2"
                  hide
                  domain={indDomains[2]}
                />
              )}

              <Tooltip contentStyle={tooltipBg} />
              <Legend wrapperStyle={{ fontSize: 13 }} />

              {/* Indicator lines */}
              {selectedInds.map((ind, idx) => (
                <Line
                  key={ind.name}
                  yAxisId={getIndAxisId(idx)}
                  type="monotone"
                  dataKey={ind.name}
                  stroke={SELECTED_INDICATOR_COLORS[idx]}
                  strokeWidth={2}
                  dot={{ r: timeRange <= 12 ? 3 : 2 }}
                >
                  {showValueLabels && (
                    <LabelList
                      dataKey={ind.name}
                      position={idx % 2 === 0 ? 'top' : 'bottom'}
                      formatter={(v: unknown) => formatYValue(Number(v))}
                      style={{ fontSize: 11, fill: SELECTED_INDICATOR_COLORS[idx], fontWeight: 600 }}
                    />
                  )}
                </Line>
              ))}

              {/* Overlay lines */}
              {overlayData?.map((ol) => (
                <Line
                  key={ol.name}
                  yAxisId={overlayAxisId}
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
        <LineChart data={chartData} margin={{ top: 20, right: hasOverlay ? 30 : 16, left: 0, bottom: 4 }}>
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
              key={ind.name}
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
