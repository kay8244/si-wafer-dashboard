'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import {
  ComposedChart,
  LineChart,
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
  IndustryMetric,
} from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useSupplyChainData } from '@/hooks/useSupplyChainData';
import FoundryUtilizationChart from '@/components/supply-chain/FoundryUtilizationChart';

interface Props {
  data: ExternalComparisonType[];
  waferInOutData: WaferInOutQuarterlyEntry[];
  bitGrowthData: BitGrowthQuarterlyEntry[];
  quarterRange: 4 | 8 | 12;
  onQuarterRangeChange: (range: 4 | 8 | 12) => void;
  customerType: 'memory' | 'foundry';
  customerId?: string;
  industryMetrics?: IndustryMetric[];
  monthlyMetrics?: { month: string; waferInput: number; utilization: number; dramRatio?: number }[];
  customerLabel?: string;
}

type QuarterRange = 4 | 8 | 12;
type MetricKey = 'waferIn' | 'waferOut' | 'ubsGrowth' | 'tfGrowth' | 'hbmGrowth';

const TIME_PRESETS: { value: QuarterRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

const METRIC_OPTIONS: { key: MetricKey; label: string; memoryOnly?: boolean }[] = [
  { key: 'waferIn', label: 'Wafer In' },
  { key: 'waferOut', label: 'Wafer Out' },
  { key: 'ubsGrowth', label: 'Bit Growth (UBS)' },
  { key: 'tfGrowth', label: 'Bit Growth (Trendforce)' },
  { key: 'hbmGrowth', label: 'HBM Bit Growth', memoryOnly: true },
];

interface CombinedEntry {
  quarter: string;
  waferIn: number;
  waferOut: number;
  waferInDram: number;
  waferInNand: number;
  waferOutDram: number;
  waferOutNand: number;
  hbmGrowth: number;
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

export default function ExternalComparison({ data, waferInOutData, bitGrowthData, quarterRange, onQuarterRangeChange, customerType, customerId, industryMetrics, monthlyMetrics, customerLabel }: Props) {
  const { data: scData } = useSupplyChainData();
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [waferFilter, setWaferFilter] = useState<'all' | 'dram' | 'nand'>('all');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(new Set(['waferIn']));

  // Pre-compute all hooks unconditionally (React rules of hooks)
  const isMemory = customerType === 'memory';
  const isKoxia = customerId === 'Koxia';
  const hasDramRatio = waferInOutData.some((d) => d.dramRatio !== undefined);
  const canFilter = isMemory && !isKoxia && hasDramRatio;

  const currentIdx = useMemo(() => {
    for (let i = 0; i < waferInOutData.length; i++) {
      if (waferInOutData[i].isEstimate) return i;
    }
    return waferInOutData.length - 1;
  }, [waferInOutData]);

  const filteredData = useMemo((): CombinedEntry[] => {
    if (customerType === 'foundry') return [];
    const half = Math.floor(quarterRange / 2);
    const center = currentIdx >= 0 ? currentIdx : Math.floor(waferInOutData.length / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(waferInOutData.length, start + quarterRange);
    const adjustedStart = Math.max(0, end - quarterRange);

    return waferInOutData.slice(adjustedStart, end).map((w, i) => {
      const globalIdx = adjustedStart + i;
      const bg = globalIdx < bitGrowthData.length ? bitGrowthData[globalIdx] : null;
      const dr = w.dramRatio ?? 0.6;
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
        hbmGrowth: (() => {
          const hbm = industryMetrics?.find((m) => m.id === 'hbm_bit_growth');
          if (!hbm) return 0;
          const qMatch = w.quarter.match(/^Q(\d)'(\d{2})/);
          const normalized = qMatch ? `${qMatch[1]}Q${qMatch[2]}` : w.quarter;
          const point = hbm.data.find((d) => d.date === normalized || d.date === w.quarter);
          return point ? point.value : 0;
        })(),
        isEstimate: w.isEstimate,
      };
    });
  }, [waferInOutData, bitGrowthData, quarterRange, currentIdx, canFilter, waferFilter, customerType, industryMetrics]);

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

  // AI analysis state (must be before any early return to satisfy React rules of hooks)
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const aiLoadingRef = useRef(false);
  const prevCustomerRef = useRef(customerId);

  // Auto-refetch when customer or metric toggles change while panel is open
  const prevCustomerRef2 = useRef(customerId);
  const prevMetricsRef = useRef([...visibleMetrics].join(','));
  useEffect(() => {
    const metricsKey = [...visibleMetrics].join(',');
    if (aiOpen && (customerId !== prevCustomerRef2.current || metricsKey !== prevMetricsRef.current)) {
      setAiInsight(null);
      fetchAiInsight();
    }
    prevCustomerRef2.current = customerId;
    prevMetricsRef.current = metricsKey;
  }, [customerId, visibleMetrics, aiOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Foundry customers: show industry metrics instead of wafer in/out placeholder
  if (customerType === 'foundry') {
    if (industryMetrics && industryMetrics.length > 0) {
      // Detect paired metrics: 매출액 + 수량 (e.g., analog_revenue + analog_volume)
      const PAIRS: [string, string, string][] = [
        ['analog_revenue', 'analog_volume', 'Analog'],
        ['mcu_revenue', 'mcu_volume', 'MCU'],
        ['mpu_revenue', 'mpu_volume', 'MPU'],
      ];
      const pairedIds = new Set<string>();
      const pairedCharts: { label: string; revenue: typeof industryMetrics[0]; volume: typeof industryMetrics[0] }[] = [];
      for (const [revId, volId, label] of PAIRS) {
        const rev = industryMetrics.find((m) => m.id === revId);
        const vol = industryMetrics.find((m) => m.id === volId);
        if (rev && vol) {
          pairedCharts.push({ label, revenue: rev, volume: vol });
          pairedIds.add(revId);
          pairedIds.add(volId);
        }
      }
      const soloMetrics = industryMetrics.filter((m) => !pairedIds.has(m.id));

      // Render single metric card
      const renderSingleCard = (metric: typeof industryMetrics[0]) => {
        const chartData = metric.data.slice(-12);
        const latest = metric.data[metric.data.length - 1];
        const prev = metric.data.length >= 2 ? metric.data[metric.data.length - 2] : null;
        const change = prev && prev.value !== 0 ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100 : null;
        const changeLabel = metric.period === 'monthly' ? 'MoM' : 'QoQ';
        // Build year groups for table header
        const singleYearGroups: { year: string; entries: typeof chartData }[] = [];
        chartData.forEach((d) => {
          const yr = d.date.length >= 4 ? d.date.slice(0, 2).replace(/\D/, '') !== '' ? d.date.slice(0, 4) : d.date.slice(0, 2) : d.date.slice(0, 2);
          // Try to extract year: "25.01" → "25", "2025-01" → "2025"
          const yrKey = (() => {
            const m = d.date.match(/^(\d{4})/);
            if (m) return m[1];
            const m2 = d.date.match(/^(\d{2})[.\-]/);
            if (m2) return `20${m2[1]}`;
            return d.date.slice(0, 4);
          })();
          void yr;
          const last = singleYearGroups[singleYearGroups.length - 1];
          if (last && last.year === yrKey) {
            last.entries.push(d);
          } else {
            singleYearGroups.push({ year: yrKey, entries: [d] });
          }
        });
        return (
          <div key={metric.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                {metric.name}
                {metric.tooltip && (
                  <span className="group relative ml-1 cursor-help text-gray-400">
                    ⓘ
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-600">
                      {metric.tooltip}
                    </span>
                  </span>
                )}
              </span>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{latest.value.toLocaleString()}</span>
                <span className="ml-0.5 text-[10px] text-gray-400">{metric.unit}</span>
                {change !== null && (
                  <span className={`ml-1.5 text-[10px] font-semibold ${change > 0 ? 'text-blue-500' : change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {changeLabel} {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ height: 80 }} className="mt-1">
              <ChartErrorBoundary chartName="ExternalComparison-line">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip formatter={(value: unknown) => [`${Number(value).toLocaleString()} ${metric.unit}`, metric.name]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
            {/* Data table */}
            {chartData.length > 0 && (
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th rowSpan={2} className="text-left px-1.5 py-0.5 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle">구분</th>
                      {singleYearGroups.map((g) => (
                        <th key={g.year} colSpan={g.entries.length} className="text-center px-1 py-0.5 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap">
                          {g.year}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-600">
                      {chartData.map((d) => {
                        const lbl = (() => {
                          const m = d.date.match(/[.\-](\d{2})$/);
                          return m ? m[1] : d.date;
                        })();
                        return (
                          <th key={d.date} className="text-center px-1 py-0.5 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300">
                            {lbl}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white dark:bg-gray-800">
                      <td className="px-1.5 py-0.5 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-blue-500">{metric.name}</td>
                      {chartData.map((d) => (
                        <td key={d.date} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                          {d.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">{changeLabel}</td>
                      {chartData.map((d, i) => {
                        const p = i > 0 ? chartData[i - 1].value : null;
                        const pct = p !== null && p !== 0 ? ((d.value - p) / Math.abs(p)) * 100 : null;
                        const sign = pct !== null && pct > 0 ? '+' : '';
                        const color = pct === null ? 'text-gray-300 dark:text-gray-600' : pct > 0 ? 'text-blue-500' : pct < 0 ? 'text-red-500' : 'text-gray-400';
                        return (
                          <td key={d.date} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                            {pct !== null ? `${sign}${pct.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      };

      // Render paired metric card (매출액=bar + 수량=line)
      const renderPairedCard = (pair: typeof pairedCharts[0]) => {
        const revData = pair.revenue.data.slice(-12);
        const volData = pair.volume.data.slice(-12);
        const combined = revData.map((r, i) => ({
          date: r.date,
          revenue: r.value,
          volume: volData[i]?.value ?? 0,
        }));
        const latestRev = revData[revData.length - 1];
        const latestVol = volData[volData.length - 1];
        // Build year groups for paired table
        const pairedYearGroups: { year: string; entries: typeof combined }[] = [];
        combined.forEach((d) => {
          const yrKey = (() => {
            const m = d.date.match(/^(\d{4})/);
            if (m) return m[1];
            const m2 = d.date.match(/^(\d{2})[.\-]/);
            if (m2) return `20${m2[1]}`;
            return d.date.slice(0, 4);
          })();
          const last = pairedYearGroups[pairedYearGroups.length - 1];
          if (last && last.year === yrKey) {
            last.entries.push(d);
          } else {
            pairedYearGroups.push({ year: yrKey, entries: [d] });
          }
        });
        return (
          <div key={pair.label} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{pair.label}</span>
              <div className="text-right text-[10px]">
                <span className="text-gray-500">매출 </span><span className="font-bold text-gray-900 dark:text-gray-100">{latestRev.value.toLocaleString()}</span><span className="text-gray-400"> {pair.revenue.unit}</span>
                <span className="mx-1 text-gray-300">|</span>
                <span className="text-gray-500">수량 </span><span className="font-bold text-gray-900 dark:text-gray-100">{latestVol.value.toLocaleString()}</span><span className="text-gray-400"> {pair.volume.unit}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 mb-0.5">
              <span className="text-[7px] text-gray-400">매출액({pair.revenue.unit})</span>
              <span className="text-[7px] text-emerald-500">수량({pair.volume.unit})</span>
            </div>
            <div style={{ height: 90 }}>
              <ChartErrorBoundary chartName="ExternalComparison-composed1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combined} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={35} domain={['dataMin - 200', 'dataMax + 200']} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: '#10b981' }} axisLine={false} tickLine={false} width={35} domain={['dataMin - 500', 'dataMax + 500']} />
                  <Tooltip
                    formatter={(value: unknown, name?: string) => {
                      const unit = name === 'revenue' ? pair.revenue.unit : pair.volume.unit;
                      const label = name === 'revenue' ? '매출액' : '수량';
                      return [`${Number(value).toLocaleString()} ${unit}`, label];
                    }}
                    contentStyle={{ fontSize: 10, borderRadius: 6 }}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" opacity={0.7} radius={[2, 2, 0, 0]} barSize={12} />
                  <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2, fill: '#10b981' }} />
                </ComposedChart>
              </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
            {/* Data table */}
            {combined.length > 0 && (
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th rowSpan={2} className="text-left px-1.5 py-0.5 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle">구분</th>
                      {pairedYearGroups.map((g) => (
                        <th key={g.year} colSpan={g.entries.length} className="text-center px-1 py-0.5 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap">
                          {g.year}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-gray-50 dark:bg-gray-600">
                      {combined.map((d) => {
                        const lbl = (() => {
                          const m = d.date.match(/[.\-](\d{2})$/);
                          return m ? m[1] : d.date;
                        })();
                        return (
                          <th key={d.date} className="text-center px-1 py-0.5 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300">
                            {lbl}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Revenue row */}
                    <tr className="bg-white dark:bg-gray-800">
                      <td className="px-1.5 py-0.5 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-blue-500">매출액({pair.revenue.unit})</td>
                      {combined.map((d) => (
                        <td key={d.date} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                          {d.revenue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      ))}
                    </tr>
                    {/* Revenue QoQ */}
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                      {combined.map((d, i) => {
                        const p = i > 0 ? combined[i - 1].revenue : null;
                        const pct = p !== null && p !== 0 ? ((d.revenue - p) / Math.abs(p)) * 100 : null;
                        const sign = pct !== null && pct > 0 ? '+' : '';
                        const color = pct === null ? 'text-gray-300 dark:text-gray-600' : pct > 0 ? 'text-blue-500' : pct < 0 ? 'text-red-500' : 'text-gray-400';
                        return (
                          <td key={d.date} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                            {pct !== null ? `${sign}${pct.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Volume row */}
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <td className="px-1.5 py-0.5 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 text-emerald-500">수량({pair.volume.unit})</td>
                      {combined.map((d) => (
                        <td key={d.date} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                          {d.volume.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </td>
                      ))}
                    </tr>
                    {/* Volume QoQ */}
                    <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">QoQ</td>
                      {combined.map((d, i) => {
                        const p = i > 0 ? combined[i - 1].volume : null;
                        const pct = p !== null && p !== 0 ? ((d.volume - p) / Math.abs(p)) * 100 : null;
                        const sign = pct !== null && pct > 0 ? '+' : '';
                        const color = pct === null ? 'text-gray-300 dark:text-gray-600' : pct > 0 ? 'text-blue-500' : pct < 0 ? 'text-red-500' : 'text-gray-400';
                        return (
                          <td key={d.date} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                            {pct !== null ? `${sign}${pct.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      };

      return (
        <div className="flex flex-col gap-4">
          {/* Unified foundry node utilization chart */}
          {scData?.foundryNodes && scData?.foundryNodeColors ? (
              <FoundryUtilizationChart foundryNodes={scData.foundryNodes} foundryNodeColors={scData.foundryNodeColors} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-gray-400">Loading...</div>
            )}
          {/* Paired industry metrics (Analog, MCU, MPU etc.) */}
          {pairedCharts.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-bold text-gray-800 dark:text-gray-100">파운드리 산업 지표</h3>
              <div className="grid grid-cols-1 gap-3">
                {pairedCharts.map(renderPairedCard)}
              </div>
            </div>
          )}
        </div>
      );
    }
    return scData?.foundryNodes && scData?.foundryNodeColors ? (
      <FoundryUtilizationChart foundryNodes={scData.foundryNodes} foundryNodeColors={scData.foundryNodeColors} />
    ) : (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">Loading...</div>
    );
  }

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


  const boundaryQuarter = currentIdx >= 0 ? waferInOutData[currentIdx]?.quarter : undefined;

  const tooltipStyle = isDark
    ? { fontSize: 11, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 11, borderRadius: 6 };

  const fetchAiInsight = async () => {
    if (aiOpen && aiInsight && !aiLoadingRef.current) { setAiOpen(false); return; }
    if (aiLoadingRef.current) return;
    setAiOpen(true);
    setAiLoading(true);
    aiLoadingRef.current = true;
    setAiInsight(null);
    try {
      const hasDramRatio = waferInOutData.some((d) => d.dramRatio !== undefined);
      const recent = filteredData.slice(-8);
      const showingIn = visibleMetrics.has('waferIn');
      const showingOut = visibleMetrics.has('waferOut');

      // Build concise data summary
      const sections: string[] = [];
      if (showingIn) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        sections.push(`Wafer In: ${first?.quarter} ${first?.waferIn} → ${last?.quarter} ${last?.waferIn}`);
        if (hasDramRatio) {
          sections.push(`  DRAM In: ${first?.waferInDram} → ${last?.waferInDram}`);
          sections.push(`  NAND In: ${first?.waferInNand} → ${last?.waferInNand}`);
        }
      }
      if (showingOut) {
        const first = recent[0];
        const last = recent[recent.length - 1];
        sections.push(`Wafer Out: ${first?.quarter} ${first?.waferOut} → ${last?.quarter} ${last?.waferOut}`);
        if (hasDramRatio) {
          sections.push(`  DRAM Out: ${first?.waferOutDram} → ${last?.waferOutDram}`);
          sections.push(`  NAND Out: ${first?.waferOutNand} → ${last?.waferOutNand}`);
        }
      }

      const monthlyRecent = (monthlyMetrics ?? []).slice(-6);
      if (monthlyRecent.length > 0) {
        const mFirst = monthlyRecent[0];
        const mLast = monthlyRecent[monthlyRecent.length - 1];
        sections.push(`웨이퍼 주요지표 투입량(K/M): ${mFirst.month} ${mFirst.waferInput}K/M → ${mLast.month} ${mLast.waferInput}K/M, 가동률 ${mLast.utilization}%`);
      }

      const thisQ = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}'${String(new Date().getFullYear()).slice(2)}`;
      const yearEnd = `Q4'${String(new Date().getFullYear()).slice(2)}`;

      const analysisParts: string[] = [];
      let n = 1;
      if (showingIn && hasDramRatio) analysisParts.push(`${n++}. DRAM Wafer In과 NAND Wafer In 추이 (증감률 위주, 간결하게)`);
      else if (showingIn) analysisParts.push(`${n++}. Wafer In 추이 (증감률 위주, 간결하게)`);
      if (showingOut && hasDramRatio) analysisParts.push(`${n++}. DRAM Wafer Out과 NAND Wafer Out 추이 (증감률 위주, 간결하게)`);
      else if (showingOut) analysisParts.push(`${n++}. Wafer Out 추이 (증감률 위주, 간결하게)`);
      if (showingIn) analysisParts.push(`${n++}. 주요지표 투입량(K/M)과 Wafer In(K/M) 차이 비교 + ${thisQ}~${yearEnd} 향후 변화 방향 (1줄)`);
      analysisParts.push(`${n++}. 다음분기~금년 말(${yearEnd}) 전망 핵심 (1줄)`);

      const context = `[${customerLabel ?? customerId} Wafer 분석]
단위: 모든 수치는 K/M(천장/월). 와트/와플 등 다른 단위 사용 금지.

${sections.join('\n')}

분석 요청:
${analysisParts.join('\n')}
규칙: 실데이터 값 나열 금지. 증감률/추세 위주 간결하게. 총 6줄 이내. 단위는 K/M만 사용.`;

      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: 'customer-wafer', context }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resData = await res.json();
      if (resData.success && resData.insight) setAiInsight(resData.insight);
    } catch { /* ignore */ }
    finally { setAiLoading(false); aiLoadingRef.current = false; }
  };

  const showIn = visibleMetrics.has('waferIn');
  const showOut = visibleMetrics.has('waferOut');
  const showUbsGrowth = visibleMetrics.has('ubsGrowth');
  const showTfGrowth = visibleMetrics.has('tfGrowth');
  const showHbmGrowth = visibleMetrics.has('hbmGrowth');
  const showAnyGrowth = showUbsGrowth || showTfGrowth || showHbmGrowth;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Wafer In/Out, B/G</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchAiInsight}
            disabled={aiLoading}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
              aiOpen ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {aiLoading ? '분석 중...' : '데이터분석'}
          </button>
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

      {/* Filter + Metric toggles (stacked) */}
      <div className="mb-2 flex flex-col gap-1">
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            {METRIC_OPTIONS.filter((m) => m.key === 'waferIn' || m.key === 'waferOut').map((m) => (
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
          <div className="flex items-center gap-1">
            {METRIC_OPTIONS.filter((m) => m.key === 'ubsGrowth' || m.key === 'tfGrowth').map((m) => (
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
          {/* HBM Bit Growth — memory customers only */}
          {isMemory && industryMetrics && industryMetrics.some((m) => m.id === 'hbm_bit_growth') && (
            <div className="flex items-center gap-1">
              {METRIC_OPTIONS.filter((m) => m.key === 'hbmGrowth').map((m) => (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    visibleMetrics.has(m.key)
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
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
        <ChartErrorBoundary chartName="ExternalComparison-composed2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 20, right: 4, left: 12, bottom: 4 }}>
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
              width={40}
              label={{ value: 'K/M', angle: -90, position: 'insideLeft', offset: 15, fontSize: 10, fill: tickFill }}
            />
            {showAnyGrowth && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => `${v}%`}
                label={{ value: '%', angle: 90, position: 'insideRight', offset: 15, fontSize: 10, fill: tickFill }}
              />
            )}
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  waferIn: 'Wafer In (Trendforce)',
                  waferInDram: 'In DRAM',
                  waferInNand: 'In NAND',
                  waferOut: 'Wafer Out (UBS)',
                  waferOutDram: 'Out DRAM',
                  waferOutNand: 'Out NAND',
                  ubsGrowth: 'Bit Growth (UBS)',
                  tfGrowth: 'Bit Growth (Trendforce)',
                };
                const n = String(name);
                const unit = n.includes('Growth') ? '%' : ' K/M';
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
              <Bar yAxisId="left" dataKey="waferInDram" fill="#3b82f6" stackId="in" barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`in-dram-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showIn && canSplit && (
              <Bar yAxisId="left" dataKey="waferInNand" fill="#93c5fd" stackId="in" radius={[2, 2, 0, 0]} barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`in-nand-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
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
              <Bar yAxisId="left" dataKey="waferOutDram" fill="#10b981" stackId="out" barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`out-dram-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
                ))}
              </Bar>
            )}
            {showOut && canSplit && (
              <Bar yAxisId="left" dataKey="waferOutNand" fill="#6ee7b7" stackId="out" radius={[2, 2, 0, 0]} barSize={8}>
                {filteredData.map((entry, i) => (
                  <Cell key={`out-nand-${i}`} opacity={entry.isEstimate ? 0.5 : 1} />
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
            {/* HBM Bit Growth line */}
            {showHbmGrowth && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="hbmGrowth"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: CombinedEntry };
                  if (!payload) return <circle key="empty" />;
                  return (
                    <circle
                      key={`hbm-${payload.quarter}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#8b5cf6'}
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[9px] text-gray-500 dark:text-gray-400">
        {showIn && !canSplit && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-500" />
            In (Trendforce, K/M)
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
            Out (UBS, K/M)
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
            Bit Growth (Trendforce)
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
                      In (Trendforce)
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
                      const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-blue-500' : qoq < 0 ? 'text-red-500' : 'text-gray-400';
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
                      Out (UBS)
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
                      const color = qoq === null ? 'text-gray-300 dark:text-gray-600' : qoq > 0 ? 'text-blue-500' : qoq < 0 ? 'text-red-500' : 'text-gray-400';
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
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-blue-500' : delta < 0 ? 'text-red-500' : 'text-gray-400';
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
                      Bit Growth (Trendforce)
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
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-blue-500' : delta < 0 ? 'text-red-500' : 'text-gray-400';
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
      {/* AI Analysis */}
      {aiOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-slate-800/40">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">AI Wafer In/Out 분석</span>
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
