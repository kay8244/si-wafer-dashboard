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
import type { EstimateTrendData } from '@/types/indicators';
import { useDarkMode } from '@/hooks/useDarkMode';

interface Props {
  data: EstimateTrendData;
  customerId?: string;
}

type MetricKey = 'waferIn' | 'waferOut' | 'ubsGrowth' | 'tfGrowth';

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'waferIn', label: 'Wafer In' },
  { key: 'waferOut', label: 'Wafer Out' },
  { key: 'ubsGrowth', label: 'Bit Growth (UBS)' },
  { key: 'tfGrowth', label: 'Bit Growth (Trendforce)' },
];

interface ChartEntry {
  reportDate: string;
  waferIn: number;   // Trendforce
  waferOut: number;   // TrendForce only
  ubsGrowth: number;
  tfGrowth: number;
  dramRatio?: number;
  waferInDram?: number;
  waferInNand?: number;
  waferOutDram?: number;
  waferOutNand?: number;
}

export default function EstimateTrendChart({ data, customerId }: Props) {
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

  const isKoxia = customerId === 'Koxia';
  const hasDramRatio = data.ubs.some((u) => u.dramRatio !== undefined);
  const canSplit = hasDramRatio && !isKoxia;

  const chartData = useMemo((): ChartEntry[] => {
    return data.ubs.map((u, i) => {
      const tf = data.trendforce[i];
      const dr = u.dramRatio ?? (tf?.dramRatio);
      const entry: ChartEntry = {
        reportDate: u.reportDate,
        waferIn: u.waferIn,
        waferOut: tf?.waferOut ?? 0,
        ubsGrowth: u.bitGrowth,
        tfGrowth: tf?.bitGrowth ?? 0,
        ...(dr !== undefined ? { dramRatio: dr } : {}),
      };
      if (canSplit && dr !== undefined) {
        entry.waferInDram = +(u.waferIn * dr).toFixed(1);
        entry.waferInNand = +(u.waferIn * (1 - dr)).toFixed(1);
        const woVal = tf?.waferOut ?? 0;
        entry.waferOutDram = +(woVal * dr).toFixed(1);
        entry.waferOutNand = +(woVal * (1 - dr)).toFixed(1);
      }
      return entry;
    });
  }, [data, canSplit]);

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
      <div className="mb-2 flex flex-col gap-1">
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
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: 12, bottom: 4 }}>
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
                  waferIn: 'In (Trendforce)',
                  waferOut: 'Out (UBS)',
                  waferInDram: 'In DRAM',
                  waferInNand: 'In NAND',
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

            {/* Wafer In (Trendforce) bars */}
            {showIn && !canSplit && (
              <Bar yAxisId="left" dataKey="waferIn" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} />
            )}
            {showIn && canSplit && (
              <Bar yAxisId="left" dataKey="waferInDram" fill="#3b82f6" stackId="in" barSize={8} />
            )}
            {showIn && canSplit && (
              <Bar yAxisId="left" dataKey="waferInNand" fill="#93c5fd" stackId="in" radius={[2, 2, 0, 0]} barSize={8} />
            )}
            {/* Wafer Out (TrendForce) bars */}
            {showOut && !canSplit && (
              <Bar yAxisId="left" dataKey="waferOut" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} />
            )}
            {showOut && canSplit && (
              <Bar yAxisId="left" dataKey="waferOutDram" fill="#10b981" stackId="out" barSize={8} />
            )}
            {showOut && canSplit && (
              <Bar yAxisId="left" dataKey="waferOutNand" fill="#6ee7b7" stackId="out" radius={[2, 2, 0, 0]} barSize={8} />
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
                      In (Trendforce)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
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
                        {chartData.map((d) => (
                          <td key={d.reportDate} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {(d.waferInDram ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#93c5fd', paddingLeft: 12 }}>
                          NAND
                        </td>
                        {chartData.map((d) => (
                          <td key={d.reportDate} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {(d.waferInNand ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].waferIn : null;
                      const chg = prev && prev > 0 ? ((d.waferIn - prev) / prev) * 100 : null;
                      const sign = chg !== null && chg > 0 ? '+' : '';
                      const color = chg === null ? 'text-gray-300 dark:text-gray-600' : chg > 0 ? 'text-blue-500' : chg < 0 ? 'text-red-500' : 'text-gray-400';
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
                      Out (UBS)
                    </td>
                    {chartData.map((d) => (
                      <td key={d.reportDate} className="px-1 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300">
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
                        {chartData.map((d) => (
                          <td key={d.reportDate} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {(d.waferOutDram ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50/30 dark:bg-gray-700/20">
                        <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] whitespace-nowrap dark:border-gray-600" style={{ color: '#6ee7b7', paddingLeft: 12 }}>
                          NAND
                        </td>
                        {chartData.map((d) => (
                          <td key={d.reportDate} className="px-1 py-0.5 border border-gray-200 text-right tabular-nums whitespace-nowrap text-[9px] text-gray-500 dark:border-gray-600 dark:text-gray-400">
                            {(d.waferOutNand ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </td>
                        ))}
                      </tr>
                    </>
                  )}
                  <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                    <td className="px-1.5 py-0.5 border border-gray-200 text-[9px] text-gray-400 whitespace-nowrap dark:border-gray-600">전월比</td>
                    {chartData.map((d, i) => {
                      const prev = i > 0 ? chartData[i - 1].waferOut : null;
                      const chg = prev && prev > 0 ? ((d.waferOut - prev) / prev) * 100 : null;
                      const sign = chg !== null && chg > 0 ? '+' : '';
                      const color = chg === null ? 'text-gray-300 dark:text-gray-600' : chg > 0 ? 'text-blue-500' : chg < 0 ? 'text-red-500' : 'text-gray-400';
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
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-blue-500' : delta < 0 ? 'text-red-500' : 'text-gray-400';
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
                      Bit Growth (Trendforce)
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
                      const color = delta === null ? 'text-gray-300 dark:text-gray-600' : delta > 0 ? 'text-blue-500' : delta < 0 ? 'text-red-500' : 'text-gray-400';
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
