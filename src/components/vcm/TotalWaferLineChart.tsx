'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from 'recharts';
import type { TotalWaferYearlyEntry } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';

const START_YEAR = 2024;
const END_YEAR = 2030;

// Market colors
const COLOR_PW = '#2563eb';
const COLOR_EPI = '#10b981';
// Internal colors — muted, toned-down
const COLOR_INT_PW = '#93a5cf';
const COLOR_INT_EPI = '#7bc8a4';

interface Props {
  data: TotalWaferYearlyEntry[];
  internalData?: TotalWaferYearlyEntry[];
}

function formatYAxis(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default function TotalWaferLineChart({ data, internalData = [] }: Props) {
  const { isDark } = useDarkMode();
  const [showYoY, setShowYoY] = useState(true);
  const [showInternal, setShowInternal] = useState(false);
  const hasInternal = internalData.length > 0;
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';

  const currentYear = new Date().getFullYear();
  const currentIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].year <= currentYear) idx = i;
    }
    return idx;
  }, [data, currentYear]);

  const filteredData = useMemo(() => data.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR), [data]);
  const filteredInternal = useMemo(() => internalData.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR), [internalData]);

  // Merged chart data
  const chartData = useMemo(() => {
    const internalMap = new Map(filteredInternal.map((d) => [d.year, d]));
    return filteredData.map((d) => {
      const int = internalMap.get(d.year);
      return {
        ...d,
        internalPw: int?.pw ?? null,
        internalEpi: int?.epi ?? null,
      };
    });
  }, [filteredData, filteredInternal]);

  const boundaryYear = currentIdx >= 0 ? data[currentIdx].year : undefined;

  // Table helpers
  const internalMap = useMemo(() => new Map(filteredInternal.map((d) => [d.year, d])), [filteredInternal]);

  const renderValueRow = (
    label: string,
    field: 'total' | 'epi' | 'pw',
    color: string,
    bgClass: string,
    bold = false,
  ) => (
    <tr className={bgClass}>
      <td className={`px-2 py-1 border border-gray-200 whitespace-nowrap dark:border-gray-600 ${bold ? 'font-semibold' : 'font-medium'}`} style={{ color }}>
        {label}
      </td>
      {filteredData.map((d) => {
        const val = d[field];
        const estCls = d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200';
        return (
          <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${bold ? 'font-semibold' : ''} ${estCls}`}>
            {val.toLocaleString()}K
          </td>
        );
      })}
    </tr>
  );

  const renderYoYRow = (field: 'total' | 'epi' | 'pw', source: TotalWaferYearlyEntry[], bgClass: string) => {
    if (!showYoY) return null;
    return (
      <tr className={bgClass}>
        <td className="px-2 py-0.5 pl-5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">YoY</td>
        {filteredData.map((d, i) => {
          const curr = source.find((x) => x.year === d.year);
          const prev = i > 0 ? source.find((x) => x.year === filteredData[i - 1].year) : null;
          const currVal = curr?.[field] ?? 0;
          const prevVal = prev?.[field] ?? 0;
          const yoy = prev && prevVal > 0 && curr ? ((currVal - prevVal) / prevVal) * 100 : null;
          const sign = yoy !== null && yoy > 0 ? '+' : '';
          const color = yoy === null ? 'text-gray-300 dark:text-gray-600' : yoy > 0 ? 'text-red-500' : yoy < 0 ? 'text-blue-500' : 'text-gray-400';
          return (
            <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
              {yoy !== null ? `${sign}${yoy.toFixed(1)}%` : '-'}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderInternalRow = (label: string, field: 'total' | 'epi' | 'pw', bgClass: string) => (
    <tr className={bgClass}>
      <td className="px-2 py-0.5 pl-5 border border-gray-200 text-[10px] font-medium whitespace-nowrap dark:border-gray-600" style={{ color: isDark ? '#a5b4c8' : '#6b7280' }}>
        {label}
      </td>
      {filteredData.map((d) => {
        const int = internalMap.get(d.year);
        const val = int?.[field];
        return (
          <td key={d.year} className="px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600" style={{ color: isDark ? '#a5b4c8' : '#6b7280' }}>
            {val != null ? `${val.toLocaleString()}K` : '-'}
          </td>
        );
      })}
    </tr>
  );

  const renderDiffRow = (field: 'total' | 'epi' | 'pw', bgClass: string) => (
    <tr className={bgClass}>
      <td className="px-2 py-0.5 pl-5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">차이</td>
      {filteredData.map((d) => {
        const int = internalMap.get(d.year);
        const marketVal = d[field];
        const intVal = int?.[field];
        if (intVal == null) return <td key={d.year} className="px-1.5 py-0.5 border border-gray-200 text-right text-[10px] text-gray-300 dark:border-gray-600 dark:text-gray-600">-</td>;
        const diff = marketVal - intVal;
        const sign = diff > 0 ? '+' : '';
        const color = diff > 0 ? 'text-red-400' : diff < 0 ? 'text-blue-400' : 'text-gray-400';
        return (
          <td key={d.year} className={`px-1.5 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[10px] dark:border-gray-600 ${color}`}>
            {sign}{diff.toLocaleString()}K
          </td>
        );
      })}
    </tr>
  );

  // CAGR calculator
  const calcCagr = (source: TotalWaferYearlyEntry[]) => {
    const filtered = source.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR);
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const years = filtered.length - 1;
    if (!first || !last || years <= 0) return { epi: null as number | null, pw: null as number | null, total: null as number | null };
    const calc = (s: number, e: number) => s > 0 && e > 0 ? (Math.pow(e / s, 1 / years) - 1) * 100 : null;
    return { epi: calc(first.epi, last.epi), pw: calc(first.pw, last.pw), total: calc(first.total, last.total) };
  };
  const fmt = (v: number | null) => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '-';

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      {/* Header row 1: title + buttons */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="shrink-0 text-base font-bold text-gray-800 dark:text-gray-100">
          Total Wafer 수요 (월평균)
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowYoY((v) => !v)}
            className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              showYoY ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            YoY
          </button>
          {hasInternal && (
            <button
              onClick={() => setShowInternal((v) => !v)}
              className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                showInternal ? 'bg-slate-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              영업 Data
            </button>
          )}
        </div>
      </div>
      {/* Header row 2: legend */}
      <div className="mb-2 flex items-center justify-end gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_PW }} />PW</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_EPI }} />EPI</span>
        {showInternal && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_INT_PW, opacity: 0.7 }} />영업 PW</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: COLOR_INT_EPI, opacity: 0.7 }} />영업 EPI</span>
          </>
        )}
      </div>

      {/* Chart — Line (market) + Bar (internal) */}
      <div style={{ height: 240 }}>
        <ChartErrorBoundary chartName="TotalWaferLineChart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 28, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={45}
              domain={[(min: number) => Math.max(0, Math.floor((min * 0.8) / 50) * 50), (max: number) => Math.ceil((max * 1.1) / 50) * 50]}
              label={{ value: 'K/M', angle: -90, position: 'insideLeft', fontSize: 11, fill: tickFill, offset: 5 }}
            />
            <Tooltip
              formatter={(value: number | undefined, name?: string) => {
                const labelMap: Record<string, string> = { pw: 'PW', epi: 'EPI', internalPw: 'PW (영업)', internalEpi: 'EPI (영업)' };
                return [`${(value ?? 0).toLocaleString()} K/M`, labelMap[name ?? ''] ?? name];
              }}
              labelFormatter={(label) => `${label}년`}
              contentStyle={isDark
                ? { fontSize: 13, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
                : { fontSize: 13, borderRadius: 6 }
              }
            />
            {boundaryYear && filteredData.some((d) => d.year === boundaryYear) && (
              <ReferenceLine
                x={boundaryYear}
                stroke={isDark ? '#fbbf24' : '#dc2626'}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                  const x = viewBox?.x ?? 0;
                  return (
                    <g>
                      <rect x={x - 22} y={2} width={44} height={18} rx={4}
                        fill={isDark ? '#1e293b' : '#fff'} stroke={isDark ? '#fbbf24' : '#dc2626'} strokeWidth={1.5} />
                      <text x={x} y={15} textAnchor="middle" fontSize={11} fontWeight={800} fill={isDark ? '#fbbf24' : '#dc2626'}>현재</text>
                    </g>
                  );
                }}
              />
            )}
            {/* Market bars */}
            <Bar dataKey="pw" fill={COLOR_PW} barSize={showInternal ? 12 : 16} radius={[2, 2, 0, 0]} name="pw">
              <LabelList dataKey="pw" position="top" formatter={(v: unknown) => `${Number(v).toLocaleString()}K`} style={{ fontSize: 8, fill: COLOR_PW, fontWeight: 600 }} />
            </Bar>
            <Bar dataKey="epi" fill={COLOR_EPI} barSize={showInternal ? 12 : 16} radius={[2, 2, 0, 0]} name="epi">
              <LabelList dataKey="epi" position="top" formatter={(v: unknown) => `${Number(v).toLocaleString()}K`} style={{ fontSize: 8, fill: COLOR_EPI, fontWeight: 600 }} />
            </Bar>
            {/* Internal bars — muted colors */}
            {showInternal && (
              <Bar dataKey="internalPw" fill={COLOR_INT_PW} opacity={0.6} barSize={12} radius={[2, 2, 0, 0]} name="internalPw">
                <LabelList dataKey="internalPw" position="top" formatter={(v: unknown) => v ? `${Number(v).toLocaleString()}K` : ''} style={{ fontSize: 8, fill: COLOR_INT_PW, fontWeight: 600 }} />
              </Bar>
            )}
            {showInternal && (
              <Bar dataKey="internalEpi" fill={COLOR_INT_EPI} opacity={0.6} barSize={12} radius={[2, 2, 0, 0]} name="internalEpi">
                <LabelList dataKey="internalEpi" position="top" formatter={(v: unknown) => v ? `${Number(v).toLocaleString()}K` : ''} style={{ fontSize: 8, fill: COLOR_INT_EPI, fontWeight: 600 }} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      {/* Data table — grouped by metric: 전체 > EPI > PW */}
      {filteredData.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">구분</th>
                {filteredData.map((d) => (
                  <th key={d.year} className={`text-center px-1.5 py-1 border border-gray-200 font-bold whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {d.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ── 전체 (Total) ── */}
              {renderValueRow('전체', 'total', isDark ? '#e2e8f0' : '#374151', 'bg-gray-50 dark:bg-gray-700', true)}
              {renderYoYRow('total', filteredData, 'bg-gray-50/50 dark:bg-gray-700/30')}
              {showInternal && renderInternalRow('영업 Data', 'total', 'bg-gray-50/30 dark:bg-gray-700/20')}
              {showInternal && renderDiffRow('total', 'bg-gray-50/30 dark:bg-gray-700/20')}

              {/* ── EPI ── */}
              {renderValueRow('EPI', 'epi', COLOR_EPI, 'bg-white dark:bg-gray-800')}
              {renderYoYRow('epi', filteredData, 'bg-gray-50/50 dark:bg-gray-700/30')}
              {showInternal && renderInternalRow('영업 Data', 'epi', 'bg-emerald-50/30 dark:bg-emerald-900/10')}
              {showInternal && renderDiffRow('epi', 'bg-emerald-50/30 dark:bg-emerald-900/10')}

              {/* ── PW ── */}
              {renderValueRow('PW', 'pw', COLOR_PW, 'bg-white dark:bg-gray-800')}
              {renderYoYRow('pw', filteredData, 'bg-gray-50/50 dark:bg-gray-700/30')}
              {showInternal && renderInternalRow('영업 Data', 'pw', 'bg-blue-50/30 dark:bg-blue-900/10')}
              {showInternal && renderDiffRow('pw', 'bg-blue-50/30 dark:bg-blue-900/10')}

              {/* ── CAGR ── */}
              {(() => {
                const marketCagr = calcCagr(data);
                return (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                    <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-blue-600 whitespace-nowrap dark:border-gray-600 dark:text-blue-400">CAGR (VCM)</td>
                    <td colSpan={filteredData.length} className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold text-blue-600 dark:border-gray-600 dark:text-blue-400">
                      EPI {fmt(marketCagr.epi)} / PW {fmt(marketCagr.pw)} / Total {fmt(marketCagr.total)}
                    </td>
                  </tr>
                );
              })()}
              {showInternal && filteredInternal.length > 0 && (() => {
                const intCagr = calcCagr(internalData);
                return (
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold whitespace-nowrap dark:border-gray-600" style={{ color: isDark ? '#a5b4c8' : '#64748b' }}>CAGR (영업)</td>
                    <td colSpan={filteredData.length} className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold dark:border-gray-600" style={{ color: isDark ? '#a5b4c8' : '#64748b' }}>
                      EPI {fmt(intCagr.epi)} / PW {fmt(intCagr.pw)} / Total {fmt(intCagr.total)}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
