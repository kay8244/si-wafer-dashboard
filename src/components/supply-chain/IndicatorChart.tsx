'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { OverlayLine, pearsonCorrelation, tightDomain, Correlation } from '@/lib/chart-utils';
import CorrelationBadges from '@/components/supply-chain/CorrelationBadges';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';

type TimeRange = 6 | 12 | 24 | 36;
const TIME_RANGES: TimeRange[] = [6, 12, 24, 36];

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

  // AI insight state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiLoadingRef = useRef(false);

  const fetchAiInsight = async (force = false) => {
    if (!force) {
      if (aiInsight && !aiLoadingRef.current && !aiOpen) { setAiOpen(true); return; }
      if (aiOpen && aiInsight && !aiLoadingRef.current) { setAiOpen(false); return; }
    }
    if (aiLoadingRef.current) return;
    const allInds = (allCategories ?? [category]).flatMap((c) => c.indicators);
    const selected = selectedIndicatorIds.map((name) => allInds.find((ind) => ind.name === name)).filter(Boolean);
    if (selected.length === 0) return;

    setAiOpen(true);
    setAiLoading(true);
    aiLoadingRef.current = true;
    setAiInsight(null);
    try {
      const indLines = selected.map((ind) => {
        const recent = ind!.monthly.slice(-12);
        const vals = recent.map((m) => `${m.month}=${m.actual}`).join(', ');
        const first = recent[0]?.actual ?? 0;
        const last = recent[recent.length - 1]?.actual ?? 0;
        const prev = recent.length >= 2 ? recent[recent.length - 2]?.actual ?? 0 : 0;
        const yoyDiff = first !== 0 ? (((last - first) / Math.abs(first)) * 100).toFixed(1) : '-';
        const momDiff = prev !== 0 ? (((last - prev) / Math.abs(prev)) * 100).toFixed(2) : '-';
        const momAbs = prev !== 0 ? (last - prev).toFixed(2) : '-';
        return `[${ind!.name}] (${ind!.unit}) 최근12개월: ${vals} | 12개월변동: ${yoyDiff}% | 전월대비: ${momAbs} (${momDiff}%)`;
      });
      // Internal overlay data — each gets its own analysis entry
      const overlayLines = (overlayData ?? []).map((o) => {
        const recent = o.data.slice(-12);
        const vals = recent.map((d) => `${d.month}=${d.value}`).join(', ');
        const first = recent[0]?.value ?? 0;
        const last = recent[recent.length - 1]?.value ?? 0;
        const prev = recent.length >= 2 ? recent[recent.length - 2]?.value ?? 0 : 0;
        const yoyDiff = first !== 0 ? (((last - first) / Math.abs(first)) * 100).toFixed(1) : '-';
        const momDiff = prev !== 0 ? (((last - prev) / Math.abs(prev)) * 100).toFixed(2) : '-';
        const momAbs = prev !== 0 ? (last - prev).toFixed(0) : '-';
        return `[내부데이터: ${o.name}] 최근12개월: ${vals} | 12개월변동: ${yoyDiff}% | 전월대비: ${momAbs} (${momDiff}%)`;
      });
      // Cross-correlation: every external indicator × every internal overlay, sorted by |r|
      const corrEntries: { label: string; r: number }[] = [];
      if (selected.length >= 1 && overlayData && overlayData.length > 0) {
        for (const ind of selected) {
          const indMap = new Map(ind!.monthly.map((m) => [m.month, m.actual]));
          for (const ol of overlayData) {
            const pairs: { x: number; y: number }[] = [];
            for (const d of ol.data) { const x = indMap.get(d.month); if (x !== undefined) pairs.push({ x, y: d.value }); }
            const r = pearsonCorrelation(pairs.map((p) => p.x), pairs.map((p) => p.y));
            if (r !== null) corrEntries.push({ label: `${ind!.name} ↔ ${ol.name}`, r });
          }
        }
      }
      corrEntries.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      const corrLines = corrEntries.map((c) => `${c.label}: r=${c.r >= 0 ? '+' : ''}${c.r.toFixed(2)}`);
      const context = `외부 지표:\n${indLines.join('\n')}${overlayLines.length > 0 ? `\n\n내부 데이터:\n${overlayLines.join('\n')}` : ''}${corrLines.length > 0 ? `\n\n상관계수 (|r| 높은순):\n${corrLines.join('\n')}` : ''}`;
      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'supply-chain', context }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.insight) setAiInsight(data.insight);
    } catch { /* ignore */ }
    finally { setAiLoading(false); aiLoadingRef.current = false; }
  };

  // Auto-refetch when indicators/overlay change while panel is open
  const prevIdsRef = useRef(selectedIndicatorIds.join(','));
  const prevOverlayRef = useRef((overlayData ?? []).map((o) => o.name).join(','));
  useEffect(() => {
    const idsKey = selectedIndicatorIds.join(',');
    const overlayKey = (overlayData ?? []).map((o) => o.name).join(',');
    if (aiOpen && (idsKey !== prevIdsRef.current || overlayKey !== prevOverlayRef.current)) {
      setAiInsight(null);
      fetchAiInsight(true);
    }
    prevIdsRef.current = idsKey;
    prevOverlayRef.current = overlayKey;
  }, [selectedIndicatorIds, overlayData, aiOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const AiButton = (
    <button
      onClick={() => fetchAiInsight()}
      disabled={aiLoading || selectedIndicatorIds.length === 0}
      className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
        aiOpen
          ? 'bg-indigo-500 text-white shadow-sm'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
      }`}
    >
      {aiLoading ? '분석 중...' : '데이터분석'}
    </button>
  );

  const AiResult = aiOpen ? (
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800 dark:bg-indigo-900/20">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">AI 데이터 분석</span>
        <button onClick={() => setAiOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
      </div>
      {aiLoading && !aiInsight && (
        <div className="animate-pulse space-y-1.5">
          <div className="h-2.5 w-5/6 rounded bg-indigo-200/50 dark:bg-indigo-700/30" />
          <div className="h-2.5 w-4/6 rounded bg-indigo-200/50 dark:bg-indigo-700/30" />
          <div className="h-2.5 w-3/6 rounded bg-indigo-200/50 dark:bg-indigo-700/30" />
        </div>
      )}
      {aiInsight && (
        <div className="space-y-1 leading-relaxed text-gray-700 dark:text-gray-300">
          {aiInsight.split('\n').filter(Boolean).map((line, i) => {
            if (line.startsWith('●')) {
              return <p key={i} className="text-[15px] font-semibold mt-2.5 first:mt-0">{line}</p>;
            }
            return <p key={i} className="text-[13px] pl-3">{line}</p>;
          })}
        </div>
      )}
    </div>
  ) : null;

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
      return tightDomain(vals) ?? [0, 1];
    });

    // Right Y domain — overlay values
    const monthSet = new Set(refMonths);
    const allRightValues = overlayData?.flatMap((ol) => ol.data.filter((d) => monthSet.has(d.month)).map((d) => d.value)) ?? [];
    const rightDomain = tightDomain(allRightValues) ?? [0, 1];

    // Correlation badges (first indicator vs overlays)
    const correlations: Correlation[] = [];
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
    const overlayAxisId = 'overlay';

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
          <div className="flex items-center gap-2">
            {AiButton}
            {TimeRangeSelector}
          </div>
        </div>

        <div className="relative">
          {/* Correlation badges */}
          <CorrelationBadges correlations={correlations} isDark={isDark} />

          <ChartErrorBoundary chartName="IndicatorChart">
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

              {/* Right Y — second indicator (visible) */}
              {selectedInds.length >= 2 && (
                <YAxis
                  yAxisId="ind1"
                  orientation="right"
                  tick={{ fontSize: 13, fill: tickColor }}
                  width={60}
                  domain={indDomains[1]}
                  tickFormatter={formatYValue}
                  stroke={SELECTED_INDICATOR_COLORS[1]}
                />
              )}

              {/* Hidden Y axis for 3rd indicator */}
              {selectedInds.length >= 3 && (
                <YAxis
                  yAxisId="ind2"
                  hide
                  domain={indDomains[2]}
                />
              )}

              {/* Overlay Y axis — always independent, hidden when other right axes exist */}
              {hasOverlay && (
                <YAxis
                  yAxisId="overlay"
                  orientation="right"
                  hide={selectedInds.length >= 2}
                  tick={{ fontSize: 13, fill: tickColor }}
                  width={selectedInds.length >= 2 ? 0 : 60}
                  domain={rightDomain}
                  tickFormatter={formatYValue}
                  stroke="#9ca3af"
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
          </ChartErrorBoundary>
        </div>
        {AiResult}
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
  const leftDomain = tightDomain(allLeftValues) ?? [0, 1];

  // Right Y domain — overlay values (filtered to time range)
  const monthSet = new Set(months);
  const allRightValues = overlayData?.flatMap((ol) => ol.data.filter((d) => monthSet.has(d.month)).map((d) => d.value)) ?? [];
  const rightDomain = tightDomain(allRightValues) ?? [0, 1];

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
      <ChartErrorBoundary chartName="IndicatorChart">
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
      </ChartErrorBoundary>
    </div>
  );
}
