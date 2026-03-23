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
  ReferenceLine,
  LabelList,
} from 'recharts';
import type { TotalWaferYearlyEntry } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';

const START_YEAR = 2024;
const END_YEAR = 2030;

interface Props {
  data: TotalWaferYearlyEntry[];
}

function formatYAxis(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default function TotalWaferLineChart({ data }: Props) {
  const { isDark } = useDarkMode();
  const [showYoY, setShowYoY] = useState(true);
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';

  // Find current boundary — dynamically based on current year
  const currentYear = new Date().getFullYear();
  const currentIdx = useMemo(() => {
    // Last year before or equal to current year
    let idx = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].year <= currentYear) idx = i;
    }
    return idx;
  }, [data, currentYear]);

  // Filter data to fixed range 2024-2030
  const filteredData = useMemo(() => {
    return data.filter((d) => d.year >= START_YEAR && d.year <= END_YEAR);
  }, [data]);

  const boundaryYear = currentIdx >= 0 ? data[currentIdx].year : undefined;

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800" style={{ minHeight: 540 }}>
      {/* Header row: title + time range buttons + legend */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="shrink-0 text-base font-bold text-gray-800 dark:text-gray-100">
          Total Wafer 수요 (월평균)
        </h3>

        {/* YoY toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowYoY((v) => !v)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
              showYoY
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            YoY
          </button>
        </div>

        {/* Legend */}
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            PW
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            EPI
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
            실적
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-gray-400 bg-white dark:bg-gray-800" />
            예측
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 28, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
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
                const label = name === 'pw' ? 'PW' : name === 'epi' ? 'EPI' : 'Total';
                return [`${(value ?? 0).toLocaleString()} K/M`, label];
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
            {/* PW line - blue */}
            <Line
              type="monotone"
              dataKey="pw"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: TotalWaferYearlyEntry };
                if (!payload) return <circle key="empty-pw" />;
                return (
                  <circle
                    key={`pw-${payload.year}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#2563eb'}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#2563eb' }}
            >
              <LabelList dataKey="pw" position="top" formatter={(v: unknown) => formatYAxis(Number(v))} style={{ fontSize: 9, fill: '#2563eb', fontWeight: 600 }} offset={8} />
            </Line>
            {/* EPI line - green */}
            <Line
              type="monotone"
              dataKey="epi"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={(props: Record<string, unknown>) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: TotalWaferYearlyEntry };
                if (!payload) return <circle key="empty-epi" />;
                return (
                  <circle
                    key={`epi-${payload.year}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isEstimate ? (isDark ? '#1e293b' : '#fff') : '#10b981'}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#10b981' }}
            >
              <LabelList dataKey="epi" position="bottom" formatter={(v: unknown) => formatYAxis(Number(v))} style={{ fontSize: 9, fill: '#10b981', fontWeight: 600 }} offset={8} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data table — yearly */}
      {filteredData.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
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
              {/* EPI */}
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-2 py-1 border border-gray-200 font-medium text-emerald-600 whitespace-nowrap dark:border-gray-600">EPI</td>
                {filteredData.map((d) => (
                  <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {d.epi.toLocaleString()}K
                  </td>
                ))}
              </tr>
              {/* EPI YoY */}
              {showYoY && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-emerald-400 whitespace-nowrap dark:border-gray-600">YoY</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].epi : null;
                    const yoy = prev && prev > 0 ? ((d.epi - prev) / prev) * 100 : null;
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
              {/* PW */}
              <tr className="bg-gray-50 dark:bg-gray-700">
                <td className="px-2 py-1 border border-gray-200 font-medium text-blue-600 whitespace-nowrap dark:border-gray-600">PW</td>
                {filteredData.map((d) => (
                  <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {d.pw.toLocaleString()}K
                  </td>
                ))}
              </tr>
              {/* PW YoY */}
              {showYoY && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-blue-400 whitespace-nowrap dark:border-gray-600">YoY</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].pw : null;
                    const yoy = prev && prev > 0 ? ((d.pw - prev) / prev) * 100 : null;
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
              {/* Total */}
              <tr className="bg-gray-100 dark:bg-gray-600 font-semibold">
                <td className="px-2 py-1 border border-gray-200 font-semibold text-gray-700 whitespace-nowrap dark:border-gray-600 dark:text-gray-200">Total</td>
                {filteredData.map((d) => (
                  <td key={d.year} className={`px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap dark:border-gray-600 ${d.isEstimate ? 'text-gray-600 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {d.total.toLocaleString()}K
                  </td>
                ))}
              </tr>
              {/* Total YoY */}
              {showYoY && (
                <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                  <td className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 whitespace-nowrap dark:border-gray-600">YoY</td>
                  {filteredData.map((d, i) => {
                    const prev = i > 0 ? filteredData[i - 1].total : null;
                    const yoy = prev && prev > 0 ? ((d.total - prev) / prev) * 100 : null;
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
              {/* CAGR row (all range) */}
              {(() => {
                const first = filteredData[0];
                const last = filteredData[filteredData.length - 1];
                const years = filteredData.length - 1;
                if (!first || !last || years <= 0) return null;
                const calc = (start: number, end: number) =>
                  start > 0 && end > 0 ? (Math.pow(end / start, 1 / years) - 1) * 100 : null;
                const epiCagr = calc(first.epi, last.epi);
                const pwCagr = calc(first.pw, last.pw);
                const totalCagr = calc(first.total, last.total);
                const fmt = (v: number | null) => v !== null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : '-';
                return (
                  <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                    <td className="px-2 py-0.5 border border-gray-200 text-[10px] font-semibold text-blue-600 whitespace-nowrap dark:border-gray-600 dark:text-blue-400">CAGR</td>
                    <td
                      colSpan={filteredData.length}
                      className="px-1.5 py-0.5 border border-gray-200 text-center text-[10px] font-semibold text-blue-600 dark:border-gray-600 dark:text-blue-400"
                    >
                      EPI {fmt(epiCagr)} / PW {fmt(pwCagr)} / Total {fmt(totalCagr)}
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
