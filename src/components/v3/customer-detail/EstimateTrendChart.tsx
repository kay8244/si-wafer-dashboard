'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { EstimateTrendData } from '@/types/v3';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Props {
  data: EstimateTrendData;
}

type MetricKey = 'waferIn' | 'waferOut' | 'ubsGrowth' | 'tfGrowth';

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'waferIn', label: 'Wafer In' },
  { key: 'waferOut', label: 'Wafer Out' },
  { key: 'ubsGrowth', label: 'Bit Growth (UBS)' },
  { key: 'tfGrowth', label: 'Bit Growth (TF)' },
];

interface ChartEntry {
  reportDate: string;
  waferIn: number;   // UBS only
  waferOut: number;   // TrendForce only
  ubsGrowth: number;
  tfGrowth: number;
}

export default function EstimateTrendChart({ data }: Props) {
  const { isDark } = useDarkMode();
  const tickFill = isDark ? '#94a3b8' : '#6b7280';
  const gridStroke = isDark ? '#334155' : '#e5e7eb';
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(new Set(['waferIn']));

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const chartData = useMemo((): ChartEntry[] => {
    return data.ubs.map((u, i) => {
      const tf = data.trendforce[i];
      return {
        reportDate: u.reportDate,
        waferIn: u.waferIn,         // UBS source
        waferOut: tf?.waferOut ?? 0, // TrendForce source
        ubsGrowth: u.bitGrowth,
        tfGrowth: tf?.bitGrowth ?? 0,
      };
    });
  }, [data]);

  const tooltipStyle = isDark
    ? { fontSize: 11, borderRadius: 6, backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }
    : { fontSize: 11, borderRadius: 6 };

  const showIn = visibleMetrics.has('waferIn');
  const showOut = visibleMetrics.has('waferOut');
  const showUbsGrowth = visibleMetrics.has('ubsGrowth');
  const showTfGrowth = visibleMetrics.has('tfGrowth');
  const showAnyGrowth = showUbsGrowth || showTfGrowth;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
          {data.targetYear}년 추정치 Trend
        </h3>
      </div>
      <p className="mb-2 text-[10px] text-gray-400 dark:text-gray-500">
        기관별 {data.targetYear}년 Wafer In/Out, Bit Growth 추정치 변화 추이 (25년 하반기 보고서 기준)
      </p>

      {/* Metric toggles */}
      <div className="mb-2 flex items-center gap-1">
        {METRIC_OPTIONS.map((m) => (
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

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="reportDate"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              width={32}
              label={{ value: 'Km\u00B2', position: 'insideTopLeft', offset: -5, fontSize: 8, fill: tickFill }}
            />
            {showAnyGrowth && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={28}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  waferIn: 'In (UBS)',
                  waferOut: 'Out (TF)',
                  ubsGrowth: 'Bit Growth (UBS)',
                  tfGrowth: 'Bit Growth (TF)',
                };
                const n = String(name);
                const unit = n.includes('Growth') ? '%' : ' Km\u00B2';
                return [`${Number(value).toLocaleString()}${unit}`, labels[n] ?? n];
              }}
            />

            {/* Wafer In (UBS) bars */}
            {showIn && (
              <Bar yAxisId="left" dataKey="waferIn" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} />
            )}
            {/* Wafer Out (TrendForce) bars */}
            {showOut && (
              <Bar yAxisId="left" dataKey="waferOut" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} />
            )}
            {/* Bit Growth (UBS) line */}
            {showUbsGrowth && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ubsGrowth"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b' }}
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
                dot={{ r: 3, fill: '#ef4444' }}
                strokeDasharray="4 4"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[9px] text-gray-500 dark:text-gray-400">
        {showIn && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-blue-500" />
            In (UBS, Km²)
          </span>
        )}
        {showOut && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-2.5 rounded-sm bg-emerald-500" />
            Out (TF, Km²)
          </span>
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
            Bit Growth (TF)
          </span>
        )}
      </div>

      {/* Data table */}
      {chartData.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="text-left px-1.5 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap">
                  추정시기
                </th>
                {chartData.map((d) => (
                  <th
                    key={d.reportDate}
                    className="text-center px-1 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap"
                  >
                    {d.reportDate}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showIn && (
                <>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#3b82f6' }}>
                      In (UBS)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.waferIn.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].waferIn : null;
                      const chg = prev && prev > 0 ? ((d.waferIn - prev) / prev) * 100 : null;
                      const sign = chg !== null && chg > 0 ? '+' : '';
                      const color = chg === null ? 'text-gray-300 dark:text-gray-600' : chg > 0 ? 'text-red-500' : chg < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.reportDate} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {chg !== null ? `${sign}${chg.toFixed(1)}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {showOut && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#10b981' }}>
                      Out (TF)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.waferOut.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].waferOut : null;
                      const chg = prev && prev > 0 ? ((d.waferOut - prev) / prev) * 100 : null;
                      const sign = chg !== null && chg > 0 ? '+' : '';
                      const color = chg === null ? 'text-gray-300 dark:text-gray-600' : chg > 0 ? 'text-red-500' : chg < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.reportDate} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {chg !== null ? `${sign}${chg.toFixed(1)}%` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {showUbsGrowth && (
                <>
                  <tr className="bg-white dark:bg-gray-800">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#f59e0b' }}>
                      Bit Growth (UBS)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.ubsGrowth.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].ubsGrowth : null;
                      const delta = prev !== null ? d.ubsGrowth - prev : null;
                      const sign = delta !== null && delta > 0 ? '+' : '';
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-red-500' : delta < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.reportDate} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
                          {delta !== null ? `${sign}${delta.toFixed(1)}%p` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {showTfGrowth && (
                <>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td className="px-1.5 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600" style={{ color: '#ef4444' }}>
                      Bit Growth (TF)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
                        {d.tfGrowth.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].tfGrowth : null;
                      const delta = prev !== null ? d.tfGrowth - prev : null;
                      const sign = delta !== null && delta > 0 ? '+' : '';
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-red-500' : delta < 0 ? 'text-blue-500' : 'text-gray-400';
                      return (
                        <td key={d.reportDate} className={`px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] dark:border-gray-600 ${color}`}>
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
    </div>
  );
}
