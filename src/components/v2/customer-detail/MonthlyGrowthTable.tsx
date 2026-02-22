'use client';

import { Fragment } from 'react';
import type { MonthlyMetricData } from '@/types/v2';

interface Props {
  data: MonthlyMetricData[];
}

type MetricKey = 'waferInput' | 'purchaseVolume';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'waferInput', label: '투입량' },
  { key: 'purchaseVolume', label: '구매량' },
];

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return 0;
  return +((current - previous) / previous * 100).toFixed(1);
}

function GrowthCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-green-600 dark:text-green-400' : value < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
  const prefix = value > 0 ? '+' : '';
  return (
    <td className={`px-1.5 py-1 text-right text-xs tabular-nums ${color}`}>
      {prefix}{value}%
    </td>
  );
}

export default function MonthlyGrowthTable({ data }: Props) {
  const recentData = data.slice(-6);
  const allData = data;

  function getGrowthValues(metricKey: MetricKey, monthIndex: number) {
    const currentIdx = allData.length - (recentData.length - monthIndex);
    const current = allData[currentIdx]?.[metricKey] ?? 0;

    const momIdx = currentIdx - 1;
    const qoqIdx = currentIdx - 3;

    const mom = momIdx >= 0 ? calcGrowth(current, allData[momIdx][metricKey]) : 0;
    const qoq = qoqIdx >= 0 ? calcGrowth(current, allData[qoqIdx][metricKey]) : 0;

    return { qoq, mom };
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-lg font-bold text-gray-800 dark:text-gray-100">
        월별 성장률 (QoQ / MoM)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400" rowSpan={2}>
                지표
              </th>
              {recentData.map((d) => (
                <th
                  key={d.month}
                  className="border-l border-gray-100 px-0.5 py-1 text-center text-xs font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-400"
                  colSpan={2}
                >
                  {d.month}
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-600">
              {recentData.map((d) => (
                <Fragment key={d.month}>
                  <th className="border-l border-gray-100 px-1 py-1 text-center text-xs font-medium text-gray-400 dark:border-gray-600">QoQ</th>
                  <th className="px-1 py-1 text-center text-xs font-medium text-gray-400">MoM</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => (
              <tr key={metric.key} className="border-b border-gray-50 last:border-0 dark:border-gray-700">
                <td className="px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {metric.label}
                </td>
                {recentData.map((_, mi) => {
                  const g = getGrowthValues(metric.key, mi);
                  return (
                    <Fragment key={mi}>
                      <GrowthCell value={g.qoq} />
                      <GrowthCell value={g.mom} />
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
