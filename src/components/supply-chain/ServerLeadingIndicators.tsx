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
  ReferenceLine,
} from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import type { ServerIndicatorData } from '@/hooks/useSupplyChainData';

const TABLE_MONTHS = 12;

interface ServerIndicator {
  id: string;
  group: string;
  subGroup: string;
  company: string;
  data: { month: string; value: number }[];
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];
const SELECTION_COLORS = [
  'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700',
  'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-700',
  'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-700',
];

type TimeRange = 6 | 12 | 24 | 36;
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
  { value: 36, label: '36M' },
];

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  indicators: ServerIndicatorData[];
}

export default function ServerLeadingIndicators({ indicators: indicatorData }: Props) {
  const INDICATORS: ServerIndicator[] = indicatorData;

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

  const [selectedIds, setSelectedIds] = useState<string[]>(['srv_sales']);
  const [timeRange, setTimeRange] = useState<TimeRange>(12);

  const toggleIndicator = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 3) return [...prev, id];
      return [...prev.slice(1), id];
    });
  };

  const tableMonths = ALL_MONTHS.slice(-TABLE_MONTHS);

  // Year groups for header
  const yearGroups = useMemo(() => {
    const groups: { year: string; count: number }[] = [];
    for (const m of tableMonths) {
      const yr = m.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) last.count++;
      else groups.push({ year: yr, count: 1 });
    }
    return groups;
  }, []);

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

  // Compute rowspans for group & subGroup
  const rows = useMemo(() => {
    const result: {
      ind: ServerIndicator;
      groupSpan: number;
      subGroupSpan: number;
      showGroup: boolean;
      showSubGroup: boolean;
    }[] = [];
    for (let i = 0; i < INDICATORS.length; i++) {
      const ind = INDICATORS[i];
      let showGroup = false, groupSpan = 0;
      if (i === 0 || INDICATORS[i - 1].group !== ind.group) {
        showGroup = true;
        groupSpan = 1;
        for (let j = i + 1; j < INDICATORS.length && INDICATORS[j].group === ind.group; j++) groupSpan++;
      }
      let showSubGroup = false, subGroupSpan = 0;
      if (ind.subGroup) {
        if (i === 0 || INDICATORS[i - 1].subGroup !== ind.subGroup || INDICATORS[i - 1].group !== ind.group) {
          showSubGroup = true;
          subGroupSpan = 1;
          for (let j = i + 1; j < INDICATORS.length && INDICATORS[j].subGroup === ind.subGroup && INDICATORS[j].group === ind.group; j++) subGroupSpan++;
        }
      }
      result.push({ ind, groupSpan, subGroupSpan, showGroup, showSubGroup });
    }
    return result;
  }, []);

  // Chart
  const chartMonths = ALL_MONTHS.slice(-timeRange);
  const selectedIndicators = INDICATORS.filter((ind) => selectedIds.includes(ind.id));
  const chartData = useMemo(() => {
    return chartMonths.map((month) => {
      const entry: Record<string, unknown> = { month: month.slice(2) };
      for (const ind of selectedIndicators) {
        const point = ind.data.find((d) => d.month === month);
        entry[ind.id] = point?.value ?? 0;
      }
      return entry;
    });
  }, [chartMonths, selectedIndicators]);

  const groupBg = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
  const borderCls = 'border border-gray-200 dark:border-gray-600';

  return (
    <div className="flex flex-col gap-5">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
          <thead>
            {/* Year row */}
            <tr className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <th colSpan={2} className="px-3 py-1.5 text-center font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-600" rowSpan={2}>
                구분
              </th>
              <th className="px-3 py-1.5 text-center font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-600" rowSpan={2}>
                업체
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
            {rows.map(({ ind, groupSpan, subGroupSpan, showGroup, showSubGroup }) => {
              const selIdx = selectedIds.indexOf(ind.id);
              const isSelected = selIdx !== -1;
              const rowHighlight = isSelected ? SELECTION_COLORS[selIdx] : '';
              const isStandalone = !ind.subGroup && !ind.company;
              const cellBorder = 'border border-gray-200 dark:border-gray-600';

              return (
                <tr
                  key={ind.id}
                  className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/50 ${rowHighlight}`}
                  onClick={() => toggleIndicator(ind.id)}
                >
                  {/* Standalone: group spans all 3 label columns */}
                  {isStandalone && showGroup && (
                    <td
                      colSpan={3}
                      className={`px-3 py-2.5 text-center font-bold text-gray-800 dark:text-gray-100 whitespace-pre-line align-middle ${cellBorder} ${groupBg}`}
                    >
                      {ind.group}
                    </td>
                  )}
                  {/* Col 1: Group (merged) — non-standalone */}
                  {!isStandalone && showGroup && (
                    <td
                      rowSpan={groupSpan}
                      className={`px-3 py-2.5 text-center font-bold text-gray-800 dark:text-gray-100 whitespace-pre-line align-middle ${cellBorder} ${groupBg}`}
                      style={{ minWidth: 90 }}
                    >
                      {ind.group}
                    </td>
                  )}
                  {!isStandalone && showSubGroup && ind.subGroup && (
                    <td
                      rowSpan={subGroupSpan}
                      className={`px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-200 whitespace-pre-line align-middle ${cellBorder} ${groupBg}`}
                      style={{ minWidth: 80 }}
                    >
                      {ind.subGroup}
                    </td>
                  )}
                  {!isStandalone && (
                    <td className={`px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-pre-line ${cellBorder}`} style={{ minWidth: 100 }}>
                      {ind.company}
                    </td>
                  )}
                  {/* Data cells */}
                  {ind.data.slice(-TABLE_MONTHS).map((d, di) => {
                    const color = d.value > 0
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : d.value < 0
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-gray-500';
                    const yearBorder = yearBoundaryIndices.has(di) ? 'border-l border-gray-200 dark:border-gray-600' : '';
                    return (
                      <td key={d.month} className={`px-3 py-2.5 text-center tabular-nums ${color} ${yearBorder}`}>
                        {d.value > 0 ? '+' : ''}{d.value.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          월별 표시: <span className="font-semibold text-gray-700 dark:text-gray-300">12MMA YoY (%)</span>
          <span className="ml-3 text-gray-400 dark:text-gray-500">| 행을 클릭하여 최대 3개 선택 (차트에 동시 표시)</span>
        </div>
      </div>

      {/* Chart */}
      {selectedIndicators.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {selectedIndicators.map((ind, idx) => {
                const name = (ind.company || ind.group).replace(/\n/g, ' ');
                return (
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
                    {name}
                    <span className="font-normal text-gray-400 dark:text-gray-500">(12MMA YoY %)</span>
                    <span className="ml-0.5 text-gray-300 text-xs">✕</span>
                    {idx < selectedIndicators.length - 1 && <span className="text-gray-300">|</span>}
                  </span>
                );
              })}
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false}
                label={{ value: 'YoY (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: tickFill }}
              />
              <ReferenceLine y={0} stroke={isDark ? '#475569' : '#9ca3af'} strokeDasharray="3 3" />
              <Tooltip contentStyle={{
                fontSize: 11, borderRadius: 8,
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#e5e7eb' : '#1f2937',
              }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {selectedIndicators.map((ind, i) => {
                const name = (ind.company || ind.group).replace(/\n/g, ' ');
                return (
                  <Line
                    key={ind.id}
                    type="monotone"
                    dataKey={ind.id}
                    name={name}
                    stroke={CHART_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 2, fill: CHART_COLORS[i] }}
                    activeDot={{ r: 4 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
