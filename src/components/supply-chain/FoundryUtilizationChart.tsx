'use client';

import { useState, useMemo, Fragment } from 'react';
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
import type { FoundryCompanyId, FoundryNode } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';

type QuarterRange = 4 | 8 | 12;

const TIME_PRESETS: { value: QuarterRange; label: string }[] = [
  { value: 4, label: '4Q' },
  { value: 8, label: '8Q' },
  { value: 12, label: '12Q' },
];

const COMPANIES: { id: FoundryCompanyId; label: string }[] = [
  { id: 'TSMC', label: 'TSMC' },
  { id: 'UMC', label: 'UMC' },
];

const DEFAULT_TSMC_NODES = ['7n', '5n', '3n', '2n'];

interface FoundryUtilizationChartProps {
  foundryNodes: Record<string, FoundryNode[]>;
  foundryNodeColors: Record<string, string>;
}

export default function FoundryUtilizationChart({ foundryNodes, foundryNodeColors }: FoundryUtilizationChartProps) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const avgLineStroke = isDark ? '#e5e7eb' : '#1f2937';
  const tooltipStyle = {
    fontSize: 11,
    borderRadius: 8,
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#1f2937',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const [company, setCompany] = useState<FoundryCompanyId>('TSMC');
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(DEFAULT_TSMC_NODES);
  const [quarterRange, setQuarterRange] = useState<QuarterRange>(4);

  const isTSMC = company === 'TSMC';
  const nodes = foundryNodes[company] ?? [];
  const advancedNodes = nodes.filter((n) => n.category === 'advanced');
  const matureNodes = nodes.filter((n) => n.category === 'mature');

  const handleCompanyChange = (c: FoundryCompanyId) => {
    setCompany(c);
    if (c === 'TSMC') {
      setSelectedNodeIds(DEFAULT_TSMC_NODES);
    }
    // UMC: no node selection needed
  };

  const toggleNode = (id: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectPreset = (preset: 'advanced' | 'mature' | 'all') => {
    if (preset === 'advanced') setSelectedNodeIds(advancedNodes.map((n) => n.id));
    else if (preset === 'mature') setSelectedNodeIds(matureNodes.map((n) => n.id));
    else setSelectedNodeIds(nodes.map((n) => n.id));
  };

  // Derive all available months from node data
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    for (const nodeList of Object.values(foundryNodes)) {
      for (const node of nodeList) {
        for (const m of node.monthly) set.add(m.month);
      }
    }
    return Array.from(set).sort();
  }, [foundryNodes]);

  const monthCount = quarterRange * 3;
  const months = allMonths.slice(-monthCount);

  // For TSMC: use selected nodes; for UMC: always use all nodes (비선단 only)
  const activeNodes = isTSMC ? nodes.filter((n) => selectedNodeIds.includes(n.id)) : nodes;

  // Build chart data
  const chartData = useMemo(() => {
    if (!isTSMC) {
      // UMC: only weighted average line
      return months.map((month) => {
        let totalInput = 0;
        let totalCapa = 0;
        for (const node of activeNodes) {
          const point = node.monthly.find((m) => m.month === month);
          if (point) {
            totalInput += point.waferInput;
            totalCapa += point.capa;
          }
        }
        return {
          month: month.slice(2),
          'UMC 비선단': totalCapa > 0 ? +(totalInput / totalCapa * 100).toFixed(1) : 0,
        };
      });
    }

    // TSMC: per-node + weighted average
    return months.map((month) => {
      const entry: Record<string, unknown> = { month: month.slice(2) };
      let totalInput = 0;
      let totalCapa = 0;
      for (const node of activeNodes) {
        const point = node.monthly.find((m) => m.month === month);
        if (point) {
          const util = point.capa > 0 ? +(point.waferInput / point.capa * 100).toFixed(1) : 0;
          entry[node.id] = util;
          totalInput += point.waferInput;
          totalCapa += point.capa;
        }
      }
      entry['avg'] = totalCapa > 0 ? +(totalInput / totalCapa * 100).toFixed(1) : 0;
      return entry;
    });
  }, [months, activeNodes, isTSMC]);

  // Build table data: rows = node labels (vertical), columns = months (horizontal)
  // For each node row, also compute MoM
  const tableMonths = months;

  // Table row definitions
  const tableRows = useMemo(() => {
    if (!isTSMC) {
      // UMC: single row "UMC 비선단 가동률"
      const values = tableMonths.map((month) => {
        let totalInput = 0;
        let totalCapa = 0;
        for (const node of activeNodes) {
          const point = node.monthly.find((m) => m.month === month);
          if (point) {
            totalInput += point.waferInput;
            totalCapa += point.capa;
          }
        }
        return totalCapa > 0 ? +(totalInput / totalCapa * 100).toFixed(1) : 0;
      });
      return [{ label: 'UMC 비선단 가동률', color: '#3b82f6', values }];
    }

    // TSMC: per-node rows + 평균 가동률 row
    const rows: { label: string; color: string; values: number[] }[] = [];
    for (const node of activeNodes) {
      const values = tableMonths.map((month) => {
        const point = node.monthly.find((m) => m.month === month);
        if (!point || point.capa <= 0) return 0;
        return +(point.waferInput / point.capa * 100).toFixed(1);
      });
      rows.push({ label: `${node.label}`, color: foundryNodeColors[node.id], values });
    }
    // Weighted average row
    if (activeNodes.length > 0) {
      const avgValues = tableMonths.map((month) => {
        let totalInput = 0;
        let totalCapa = 0;
        for (const node of activeNodes) {
          const point = node.monthly.find((m) => m.month === month);
          if (point) {
            totalInput += point.waferInput;
            totalCapa += point.capa;
          }
        }
        return totalCapa > 0 ? +(totalInput / totalCapa * 100).toFixed(1) : 0;
      });
      rows.unshift({ label: '평균 가동률', color: '#1f2937', values: avgValues });
    }
    return rows;
  }, [tableMonths, activeNodes, isTSMC]);

  // Year groups for table header
  const yearGroups = useMemo(() => {
    const groups: { year: string; count: number }[] = [];
    for (const month of tableMonths) {
      const yr = month.slice(0, 4);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) last.count++;
      else groups.push({ year: yr, count: 1 });
    }
    return groups;
  }, [tableMonths]);

  const hasActiveNodes = isTSMC ? activeNodes.length > 0 : true;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Row 1: Title + Period selector */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
          Foundry 노드별 가동률
        </h3>
        <div className="flex items-center gap-1">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setQuarterRange(preset.value)}
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
      </div>

      {/* Row 2: Company tabs + Presets + Node selectors (TSMC only) */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {/* Company toggle */}
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-gray-600">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCompanyChange(c.id)}
              className={`px-3 py-1 font-semibold transition-colors ${
                company === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* TSMC: Presets + Node selectors */}
        {isTSMC && (
          <>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />

            {/* Preset buttons */}
            <button
              onClick={() => selectPreset('advanced')}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                selectedNodeIds.length === advancedNodes.length && advancedNodes.every((n) => selectedNodeIds.includes(n.id))
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}
            >
              선단
            </button>
            <button
              onClick={() => selectPreset('mature')}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                selectedNodeIds.length === matureNodes.length && matureNodes.every((n) => selectedNodeIds.includes(n.id))
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
              }`}
            >
              비선단
            </button>
            <button
              onClick={() => selectPreset('all')}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                selectedNodeIds.length === nodes.length
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              ALL
            </button>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />

            {/* Node checkboxes — mature */}
            <div className="flex items-center gap-1">
              <span className="mr-0.5 text-[10px] text-gray-400">비선단</span>
              {matureNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleNode(n.id)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    selectedNodeIds.includes(n.id)
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                  style={selectedNodeIds.includes(n.id) ? { backgroundColor: foundryNodeColors[n.id] } : undefined}
                >
                  {n.label}
                </button>
              ))}
            </div>

            {/* Node checkboxes — advanced */}
            <div className="flex items-center gap-1">
              <span className="mr-0.5 text-[10px] text-gray-400">선단</span>
              {advancedNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleNode(n.id)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    selectedNodeIds.includes(n.id)
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                  style={selectedNodeIds.includes(n.id) ? { backgroundColor: foundryNodeColors[n.id] } : undefined}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      {!hasActiveNodes ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          노드를 선택해주세요
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[(min: number) => Math.max(0, Math.floor(min / 5) * 5 - 5), (max: number) => Math.min(100, Math.ceil(max / 5) * 5 + 5)]}
              tick={{ fontSize: 10, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              label={{ value: '가동률 (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: tickFill }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              formatter={(value: string) => (value === 'avg' ? '평균 가동률' : value)}
            />
            {isTSMC ? (
              <>
                {activeNodes.map((node) => (
                  <Line
                    key={node.id}
                    type="monotone"
                    dataKey={node.id}
                    name={node.label}
                    stroke={foundryNodeColors[node.id]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="avg"
                  stroke={avgLineStroke}
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="UMC 비선단"
                name="UMC 비선단 가동률"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 2, fill: '#3b82f6' }}
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Data Table — rows=metrics, cols=months */}
      {hasActiveNodes && tableRows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              {/* Year header row */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th rowSpan={2} className="sticky left-0 z-10 bg-gray-100 px-1.5 py-0.5 text-left font-semibold text-gray-600 border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle">
                  구분
                </th>
                {yearGroups.map((g) => (
                  <th key={g.year} colSpan={g.count} className="px-1 py-0.5 text-center font-bold text-gray-700 border border-gray-200 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap">
                    {g.year}
                  </th>
                ))}
              </tr>
              {/* Month header row */}
              <tr className="bg-gray-50 dark:bg-gray-600">
                {tableMonths.map((m) => (
                  <th key={m} className="px-1 py-0.5 text-center font-semibold text-gray-600 border border-gray-200 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {m.slice(5, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const isAvg = row.label === '평균 가동률';
                return (
                  <Fragment key={row.label}>
                    {/* Value row */}
                    <tr>
                      <td
                        className={`sticky left-0 z-10 px-1.5 py-0.5 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600 ${
                          isAvg ? 'bg-gray-50 font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-100' : 'bg-white dark:bg-gray-800'
                        }`}
                        style={{ color: isAvg ? undefined : row.color }}
                      >
                        {row.label}
                      </td>
                      {row.values.map((v, i) => (
                        <td key={i} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${
                          isAvg ? 'font-bold text-gray-800 bg-gray-50 dark:text-gray-100 dark:bg-gray-700' : 'text-gray-700 bg-white dark:text-gray-300 dark:bg-gray-800'
                        }`}>
                          {v.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                    {/* MoM row — directly below its metric */}
                    <tr key={`mom-${row.label}`} className="bg-gray-50/50 dark:bg-gray-700/30">
                      <td className="sticky left-0 z-10 bg-gray-50/50 px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:bg-gray-700/30 dark:border-gray-600">
                        MoM
                      </td>
                      {row.values.map((v, i) => {
                        const prev = i > 0 ? row.values[i - 1] : null;
                        const diff = prev !== null && prev !== 0 ? v - prev : null;
                        const sign = diff !== null && diff > 0 ? '+' : '';
                        const color = diff === null
                          ? 'text-gray-300 dark:text-gray-600'
                          : diff > 0 ? 'text-blue-500' : diff < 0 ? 'text-red-500' : 'text-gray-400';
                        return (
                          <td key={i} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                            {diff !== null ? `${sign}${diff.toFixed(1)}%p` : '-'}
                          </td>
                        );
                      })}
                    </tr>
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
