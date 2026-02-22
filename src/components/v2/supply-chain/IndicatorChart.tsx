'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { SupplyChainCategory, ViewMode } from '@/types/v2';
import { useDarkMode } from '@/hooks/useDarkMode';

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
  const { isDark } = useDarkMode();
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  const tickColor = isDark ? '#94a3b8' : undefined;
  const tooltipBg = isDark ? { fontSize: 13, borderRadius: 8, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' } : { fontSize: 13, borderRadius: 8 };
  const hasOverlay = overlayData && overlayData.length > 0;

  // Determine which indicators to show
  const indicators =
    selectedIndicatorId !== null
      ? category.indicators.filter((ind) => ind.id === selectedIndicatorId)
      : category.indicators;

  // ── Single indicator selected ──
  if (selectedIndicatorId !== null && indicators.length > 0) {
    const ind = indicators[0];
    const vmLine = VIEW_MODE_LINE[viewMode];

    const chartData = ind.monthly.map((m) => {
      const entry: Record<string, string | number> = {
        month: m.month.slice(5),
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

    // Left Y domain — tight scale around single viewMode values
    const allLeftValues = ind.monthly.map((m) => getFieldValue(m, viewMode));
    const leftDomain = tightDomain(allLeftValues);

    // Right Y domain — tight scale around overlay values
    const allRightValues = overlayData?.flatMap((ol) => ol.data.map((d) => d.value)) ?? [];
    const rightDomain = tightDomain(allRightValues);

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {/* Title */}
        <p className="mb-1 text-sm font-bold text-gray-800">
          {ind.name}
          <span className="ml-2 text-xs font-normal text-gray-400">({ind.unit}) — {vmLine.label}</span>
          {hasOverlay && (
            <span className="ml-3 text-xs font-normal text-gray-400">| 오른쪽 축: 내부 데이터</span>
          )}
        </p>
        {/* Judgment banner */}
        {ind.judgment && (
          <div className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <span className="mr-1.5 font-semibold text-blue-600">판단:</span>
            {ind.judgment}
          </div>
        )}
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 4, right: hasOverlay ? 16 : 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: tickColor }} />
            {/* Left Y — single viewMode line with tight domain */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 13, fill: tickColor }}
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
                tick={{ fontSize: 13, fill: tickColor }}
                width={65}
                domain={rightDomain}
                tickFormatter={formatYValue}
                stroke="#9ca3af"
              />
            )}
            <Tooltip contentStyle={tooltipBg} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey={vmLine.label}
              stroke={vmLine.color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {overlayData?.map((ol) => (
              <Line
                key={ol.name}
                yAxisId="right"
                type="monotone"
                dataKey={ol.name}
                stroke={ol.color}
                strokeWidth={2}
                dot={{ r: 3, fill: ol.color }}
                strokeDasharray="6 3"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── No selection — show all indicators ──
  const months = category.indicators[0]?.monthly.map((m) => m.month) ?? [];
  const chartData = months.map((month, i) => {
    const entry: Record<string, string | number> = { month: month.slice(5) };
    category.indicators.forEach((ind) => {
      const m = ind.monthly[i];
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

  // Left Y domain — all indicator values
  const allLeftValues = category.indicators.flatMap((ind) =>
    ind.monthly.map((m) => getFieldValue(m, viewMode)),
  );
  const leftDomain = tightDomain(allLeftValues);

  // Right Y domain — overlay values
  const allRightValues = overlayData?.flatMap((ol) => ol.data.map((d) => d.value)) ?? [];
  const rightDomain = tightDomain(allRightValues);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="mb-3 text-sm font-bold text-gray-800">
        All Indicators —{' '}
        {viewMode === 'actual'
          ? 'Actual'
          : viewMode === 'threeMonthMA'
            ? '3MMA'
            : viewMode === 'twelveMonthMA'
              ? '12MMA'
              : viewMode.toUpperCase()}
        <span className="ml-2 text-xs font-normal text-gray-400">(행을 클릭하면 개별 지표를 볼 수 있습니다)</span>
        {hasOverlay && (
          <span className="ml-3 text-xs font-normal text-gray-400">| 오른쪽 축: 내부 데이터</span>
        )}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: hasOverlay ? 16 : 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fontSize: 13, fill: tickColor }} />
          {/* Left Y — indicator data */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 13, fill: tickColor }}
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
              tick={{ fontSize: 13, fill: tickColor }}
              width={65}
              domain={rightDomain}
              tickFormatter={formatYValue}
              stroke="#9ca3af"
            />
          )}
          <Tooltip contentStyle={tooltipBg} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {category.indicators.map((ind, idx) => (
            <Line
              key={ind.id}
              yAxisId="left"
              type="monotone"
              dataKey={ind.name}
              stroke={INDICATOR_COLORS[idx % INDICATOR_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
          {overlayData?.map((ol) => (
            <Line
              key={ol.name}
              yAxisId="right"
              type="monotone"
              dataKey={ol.name}
              stroke={ol.color}
              strokeWidth={2}
              dot={{ r: 3, fill: ol.color }}
              strokeDasharray="6 3"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
