'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import type { YearlyValue } from '@/types/indicators';

interface DataPoint {
  year: number;
  value: number;
  isEstimate: boolean;
}

export interface MountDataItem {
  label: string;
  data: YearlyValue[];
  color: string;
  group?: 'wafer' | 'primary' | 'secondary';
}

interface DemandBarChartProps {
  title: string;
  data: DataPoint[];
  barColor?: string;
  barLabel?: string;
  secondaryData?: DataPoint[];
  secondaryLabel?: string;
  secondaryColor?: string;
  mountData?: MountDataItem[];
}

const START_YEAR = 2024;
const END_YEAR = 2030;

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

export default function DemandBarChart({
  title,
  data,
  barColor = '#3b82f6',
  barLabel,
  secondaryData,
  secondaryLabel,
  secondaryColor = '#8b5cf6',
  mountData,
}: DemandBarChartProps) {
  const { isDark } = useDarkMode();
  const [showYoY, setShowYoY] = useState(false);
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const labelFill = isDark ? '#cbd5e1' : '#374151';
  const tooltipStyle = isDark
    ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 13, borderRadius: 6 };

  const hasDualBars = !!secondaryData && secondaryData.length > 0;

  // Find current boundary — dynamically based on current year
  const currentYear = new Date().getFullYear();
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].year <= currentYear) idx = i;
    }
    return idx;
  }, [data, currentYear]);

  // Fixed range 2024-2030
  const filteredData = useMemo(() => {
    return data.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR);
  }, [data]);

  // Secondary data aligned to same years
  const filteredSecondary = useMemo(() => {
    if (!hasDualBars || !secondaryData) return undefined;
    return filteredData.map((d) => {
      const match = secondaryData.find((s) => s.year === d.year);
      return match ?? { year: d.year, value: 0, isEstimate: d.isEstimate };
    });
  }, [secondaryData, hasDualBars, filteredData]);

  const boundaryYear = currentIdx >= 0 ? data[currentIdx]?.year : undefined;

  // Mount table data (declared early so chartData can reference waferRows)
  const waferRows = useMemo(() => mountData?.filter((m) => m.group === 'wafer') ?? [], [mountData]);

  // Combined chart data for Recharts (includes waferDemand for right axis line)
  const chartData = useMemo(() => {
    return filteredData.map((d, i) => {
      const waferEntry = waferRows[0]?.data.find((v) => v.year === d.year);
      return {
        year: d.year,
        isEstimate: d.isEstimate,
        primary: d.value,
        ...(filteredSecondary ? { secondary: filteredSecondary[i]?.value ?? 0 } : {}),
        ...(waferEntry != null ? { waferDemand: waferEntry.value } : {}),
      };
    });
  }, [filteredData, filteredSecondary, waferRows]);

  // Right Y-axis domain for wafer demand line
  const hasWaferLine = waferRows.length > 0;

  // CAGR for wafer demand line
  const waferCagr = useMemo(() => {
    if (!hasWaferLine) return null;
    const wd = waferRows[0].data.filter((v) => v.year >= 2024 && v.year <= 2030);
    if (wd.length < 2) return null;
    const first = wd[0].value;
    const last = wd[wd.length - 1].value;
    const years = wd.length - 1;
    if (first <= 0 || last <= 0) return null;
    return (Math.pow(last / first, 1 / years) - 1) * 100;
  }, [hasWaferLine, waferRows]);
  const waferYDomain = useMemo(() => {
    if (!hasWaferLine) return [0, 100];
    const values = waferRows[0].data
      .filter((v) => v.year >= 2024 && v.year <= 2030)
      .map((v) => v.value);
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.2;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [hasWaferLine, waferRows]);

  // Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const values = chartData.flatMap((d) => {
      const v = [d.primary];
      if ('secondary' in d && typeof d.secondary === 'number') v.push(d.secondary);
      return v;
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = range * 0.15;
    // If range is small relative to values, zoom in (don't start from 0)
    const ratio = range / max;
    const bottom = ratio < 0.5
      ? Math.max(0, Math.floor((min - padding) / (max > 100000 ? 100000 : max > 10000 ? 10000 : 1000)) * (max > 100000 ? 100000 : max > 10000 ? 10000 : 1000))
      : 0;
    const top = Math.ceil((max + padding) / (max > 100000 ? 100000 : max > 10000 ? 10000 : 1000)) * (max > 100000 ? 100000 : max > 10000 ? 10000 : 1000);
    return [bottom, top];
  }, [chartData]);

  // AI analysis state
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiLoadingRef = useRef(false);

  const fetchAiInsight = async () => {
    if (aiOpen && aiInsight && !aiLoadingRef.current) { setAiOpen(false); return; }
    if (aiLoadingRef.current) return;
    setAiOpen(true);
    setAiLoading(true);
    aiLoadingRef.current = true;
    setAiInsight(null);
    try {
      const primaryLabel = barLabel ?? title;
      const dataLines = filteredData.map((d) => `${d.year}: ${formatTableValue(d.value)} ${d.isEstimate ? '(예측)' : '(실적)'}`).join('\n');
      const secLines = filteredSecondary && filteredSecondary.length > 0
        ? filteredSecondary.map((d) => `${d.year}: ${formatTableValue(d.value)}`).join('\n')
        : '';
      const hasDual = !!secondaryData && secondaryData.length > 0;
      // Group mount data by type
      const primaryMount = (mountData ?? []).filter((m) => m.group === 'primary' || (!m.group && !hasDual));
      const secondaryMount = (mountData ?? []).filter((m) => m.group === 'secondary');
      const waferMount = (mountData ?? []).filter((m) => m.group === 'wafer');
      const formatMount = (items: MountDataItem[]) => items.map((m) => {
        const recent = m.data.filter((d) => d.year >= START_YEAR).map((d) => `${d.year}=${d.value}`).join(', ');
        return `  ${m.label}: ${recent}`;
      }).join('\n');
      const thisYear = new Date().getFullYear();
      const nextYear = thisYear + 1;

      let analysisRequest = '';
      if (hasDual) {
        analysisRequest = `분석 요청:
1. ${primaryLabel} 기기판매량 추이 + 대당탑재량 변화 (2~3줄)
2. ${secondaryLabel} 기기판매량 추이 + 대당탑재량 변화 (2~3줄)
3. 올해(${thisYear})~내년(${nextYear}) 두 카테고리 비교 핵심 (1~2줄)
4. 웨이퍼 수요 관점 시사점 (1~2줄)`;
      } else {
        analysisRequest = `분석 요청:
1. 기기판매량 장기 추이 + 대당탑재량 변화 (2~3줄)
2. 올해(${thisYear})~내년(${nextYear}) 핵심 포인트 (1~2줄)
3. 웨이퍼 수요 관점 시사점 (1~2줄)`;
      }

      const context = `[${title} 수요 분석]

${primaryLabel} 기기판매량:
${dataLines}
${secLines ? `\n${secondaryLabel} 기기판매량:\n${secLines}` : ''}
${primaryMount.length > 0 ? `\n${primaryLabel} 대당탑재량:\n${formatMount(primaryMount)}` : ''}
${secondaryMount.length > 0 ? `\n${secondaryLabel} 대당탑재량:\n${formatMount(secondaryMount)}` : ''}
${waferMount.length > 0 ? `\n월평균 웨이퍼 수요:\n${formatMount(waferMount)}` : ''}

${analysisRequest}
규칙: 상관관계 불필요. 총 8줄 이내. 수치 근거 필수.`;

      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'vcm-app', context }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resData = await res.json();
      if (resData.success && resData.insight) setAiInsight(resData.insight);
    } catch { /* ignore */ }
    finally { setAiLoading(false); aiLoadingRef.current = false; }
  };

  // Auto-refetch when app category changes while panel is open
  const prevTitleRef = useRef(title);
  useEffect(() => {
    if (aiOpen && title !== prevTitleRef.current) {
      setAiInsight(null);
      fetchAiInsight();
    }
    prevTitleRef.current = title;
  }, [title, aiOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mount table data (remaining rows — waferRows declared earlier)
  const primaryMountRows = useMemo(() => mountData?.filter((m) => m.group === 'primary') ?? [], [mountData]);
  const secondaryMountRows = useMemo(() => mountData?.filter((m) => m.group === 'secondary') ?? [], [mountData]);
  const ungroupedRows = useMemo(() => mountData?.filter((m) => !m.group) ?? [], [mountData]);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header: title + time range selector */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYoY((v) => !v)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              showYoY
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            YoY
          </button>
          <button
            onClick={fetchAiInsight}
            disabled={aiLoading}
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              aiOpen ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {aiLoading ? '분석 중...' : '데이터분석'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-1 flex items-center justify-center gap-4 text-[11px]">
        {hasDualBars ? (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: barColor }} />
              <span className="text-gray-600 dark:text-gray-400">{barLabel ?? '기기판매량(ea)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
              <span className="text-gray-600 dark:text-gray-400">{secondaryLabel}</span>
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: barColor }} />
            <span className="text-gray-600 dark:text-gray-400">{barLabel ?? '기기판매량(ea)'}</span>
          </span>
        )}
        {hasWaferLine && (
          <span className="flex items-center gap-1">
            <svg width="16" height="10" className="shrink-0">
              <line x1="0" y1="5" x2="16" y2="5" stroke="#111827" strokeWidth="2" />
              <circle cx="8" cy="5" r="2.5" fill="#111827" />
            </svg>
            <span className="text-gray-600 dark:text-gray-400">Wafer 수요 (월평균)</span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[8px] text-gray-700 dark:text-gray-300 font-medium">기기판매량(ea)</span>
        {hasWaferLine && <span className="text-[8px] text-gray-700 dark:text-gray-300 font-medium">Wafer 수요(K장)</span>}
      </div>
      <div style={{ height: 320 }}>
        <ChartErrorBoundary chartName="DemandBarChart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: isDark ? '#e2e8f0' : '#1f2937' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={yDomain}
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: isDark ? '#e2e8f0' : '#1f2937' }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            {hasWaferLine && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={waferYDomain}
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: isDark ? '#e2e8f0' : '#1f2937' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
            )}
            <Tooltip
              formatter={(value, name) => {
                if (name === 'waferDemand') return [formatTableValue(Number(value)) + '장', 'Wafer 수요 (월평균)'];
                if (name === 'secondary') return [Number(value).toLocaleString(), secondaryLabel ?? 'Secondary'];
                return [Number(value).toLocaleString(), barLabel ?? '기기판매량'];
              }}
              labelFormatter={(label) => `${label}년`}
              contentStyle={tooltipStyle}
            />
            {boundaryYear && filteredData.some((d) => d.year === boundaryYear) && (
              <ReferenceLine
                yAxisId="left"
                x={boundaryYear}
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
            <Bar yAxisId="left" dataKey="primary" radius={hasDualBars ? [2, 2, 0, 0] : [3, 3, 0, 0]}>
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
              <Bar yAxisId="left" dataKey="secondary" radius={[2, 2, 0, 0]}>
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
            {hasWaferLine && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="waferDemand"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      {/* Data table — yearly */}
      {filteredData.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap" style={{ width: '1%' }}>
                  구분
                </th>
                {filteredData.map((d) => (
                  <th
                    key={d.year}
                    className={`text-center px-1.5 py-1 border border-gray-200 font-bold whitespace-nowrap dark:border-gray-600 ${
                      d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {d.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ── SERVER / AUTOMOTIVE dual-bar section ── */}
              {hasDualBars ? (
                <>
                  {/* Combined Wafer 수요 row */}
                  {waferRows.map((mount) => (
                    <tr key={mount.label} className="bg-gray-100 dark:bg-gray-600">
                      <td className="px-2 py-1.5 border border-gray-200 font-bold whitespace-nowrap dark:border-gray-600 text-xs" style={{ color: '#111827' }}>
                        {mount.label}
                      </td>
                      {filteredData.map((d) => {
                        const mv = mount.data.find((v) => v.year === d.year);
                        return (
                          <td key={d.year} className={`px-1.5 py-1.5 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-xs font-bold ${mv?.isEstimate ? 'text-gray-700 dark:text-gray-200' : 'text-gray-900 dark:text-gray-100'}`}>
                            {mv ? formatTableValue(mv.value) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Wafer YoY */}
                  {showYoY && waferRows.map((mount) => (
                    <tr key={`${mount.label}-yoy`} className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: '#111827', opacity: 0.6 }}>YoY</td>
                      {filteredData.map((d, i) => {
                        const cur = mount.data.find((v) => v.year === d.year);
                        const prev = i > 0 ? mount.data.find((v) => v.year === filteredData[i - 1].year) : null;
                        const yoy = cur && prev && prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : null;
                        const sign = yoy !== null && yoy > 0 ? '+' : '';
                        const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Primary bar data row */}
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: barColor }}>
                      {barLabel ?? '기기판매량'}
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                        {formatTableValue(d.value)}
                      </td>
                    ))}
                  </tr>
                  {/* Primary YoY */}
                  {showYoY && (
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: barColor, opacity: 0.6 }}>YoY</td>
                      {filteredData.map((d, i) => {
                        const prev = i > 0 ? filteredData[i - 1].value : null;
                        const yoy = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null;
                        const sign = yoy !== null && yoy > 0 ? '+' : '';
                        const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {/* Primary mount per unit — right after primary bar */}
                  {primaryMountRows.map((mount) => (
                    <tr key={mount.label} className="bg-white dark:bg-gray-800">
                      <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[11px]" style={{ color: mount.color }}>
                        {mount.label}
                      </td>
                      {filteredData.map((d) => {
                        const mv = mount.data.find((v) => v.year === d.year);
                        return (
                          <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[11px] ${mv?.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {mv ? mv.value.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Secondary bar data row */}
                  {filteredSecondary && (
                    <>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: secondaryColor }}>
                          {secondaryLabel}
                        </td>
                        {filteredSecondary.map((d) => (
                          <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {formatTableValue(d.value)}
                          </td>
                        ))}
                      </tr>
                      {showYoY && (
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                          <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: secondaryColor, opacity: 0.6 }}>YoY</td>
                          {filteredSecondary.map((d, i) => {
                            const prev = i > 0 ? filteredSecondary[i - 1].value : null;
                            const yoy = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null;
                            const sign = yoy !== null && yoy > 0 ? '+' : '';
                            const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                            return (
                              <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                                {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </>
                  )}
                  {/* Secondary mount per unit — right after secondary bar */}
                  {secondaryMountRows.map((mount) => (
                    <tr key={mount.label} className="bg-gray-50 dark:bg-gray-700">
                      <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[11px]" style={{ color: mount.color }}>
                        {mount.label}
                      </td>
                      {filteredData.map((d) => {
                        const mv = mount.data.find((v) => v.year === d.year);
                        return (
                          <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[11px] ${mv?.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {mv ? mv.value.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {/* Wafer 수요 row (single-bar) */}
                  {waferRows.map((mount) => (
                    <tr key={mount.label} className="bg-gray-100 dark:bg-gray-600">
                      <td className="px-2 py-1.5 border border-gray-200 font-bold whitespace-nowrap dark:border-gray-600 text-xs" style={{ color: '#111827' }}>
                        {mount.label}
                      </td>
                      {filteredData.map((d) => {
                        const mv = mount.data.find((v) => v.year === d.year);
                        return (
                          <td key={d.year} className={`px-1.5 py-1.5 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-xs font-bold ${mv?.isEstimate ? 'text-gray-700 dark:text-gray-200' : 'text-gray-900 dark:text-gray-100'}`}>
                            {mv ? formatTableValue(mv.value) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Wafer YoY (single-bar) */}
                  {showYoY && waferRows.map((mount) => (
                    <tr key={`${mount.label}-yoy`} className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: '#111827', opacity: 0.6 }}>YoY</td>
                      {filteredData.map((d, i) => {
                        const cur = mount.data.find((v) => v.year === d.year);
                        const prev = i > 0 ? mount.data.find((v) => v.year === filteredData[i - 1].year) : null;
                        const yoy = cur && prev && prev.value > 0 ? ((cur.value - prev.value) / prev.value) * 100 : null;
                        const sign = yoy !== null && yoy > 0 ? '+' : '';
                        const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Single-bar: primary data row */}
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: barColor }}>
                      {barLabel ?? '기기판매량'}
                    </td>
                    {filteredData.map((d) => (
                      <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                        {formatTableValue(d.value)}
                      </td>
                    ))}
                  </tr>
                  {/* YoY */}
                  {showYoY && (
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-2 py-0.5 border border-gray-200 text-[10px] whitespace-nowrap dark:border-gray-600" style={{ color: barColor, opacity: 0.6 }}>YoY</td>
                      {filteredData.map((d, i) => {
                        const prev = i > 0 ? filteredData[i - 1].value : null;
                        const yoy = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null;
                        const sign = yoy !== null && yoy > 0 ? '+' : '';
                        const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
                        return (
                          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
                            {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                  {/* Mount rows (ungrouped for single-bar) */}
                  {ungroupedRows.map((mount) => (
                    <tr key={mount.label} className="bg-gray-50 dark:bg-gray-700">
                      <td className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-[11px]" style={{ color: mount.color }}>
                        {mount.label}
                      </td>
                      {filteredData.map((d) => {
                        const mv = mount.data.find((v) => v.year === d.year);
                        return (
                          <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 text-[11px] ${mv?.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {mv ? mv.value.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* AI Analysis */}
      {aiOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-slate-800/40">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">AI {title} 분석</span>
            <button onClick={() => setAiOpen(false)} className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">닫기</button>
          </div>
          {aiLoading && !aiInsight && (
            <div className="animate-pulse space-y-2">
              <div className="h-3.5 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3.5 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          {aiInsight && (
            <ul className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              {aiInsight.split('\n').filter(Boolean).map((line, i) => {
                if (line.startsWith('●')) {
                  return (
                    <li key={i} className="flex items-start gap-1.5 mt-2 first:mt-0">
                      <span className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400">●</span>
                      <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{line.replace(/^●\s*/, '')}</span>
                    </li>
                  );
                }
                return (
                  <li key={i} className="flex items-start gap-1.5 pl-4">
                    <span className="mt-1 shrink-0 text-gray-400">•</span>
                    <span className="text-[12px]">{line.replace(/^-\s*/, '')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
