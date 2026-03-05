'use client';

import { useMemo } from 'react';
import type { MonthlyMetricData } from '@/types/indicators';
import type { MetricKey } from './MonthlyMetricsChart';

interface Props {
  data: MonthlyMetricData[];
  selectedMetrics?: MetricKey[];
}

const ALL_METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'waferInput', label: '투입량', color: '#3B82F6' },
  { key: 'purchaseVolume', label: '구매량', color: '#10B981' },
  { key: 'capa', label: 'Capa', color: '#8B5CF6' },
  { key: 'inventoryMonths', label: '재고수준', color: '#F59E0B' },
  { key: 'utilization', label: '가동률', color: '#EF4444' },
];

function getYear(month: string): string {
  return month.split('.')[0];
}

function getMonthLabel(month: string): string {
  const parts = month.split('.');
  return parts.length > 1 ? `${parseInt(parts[1])}월` : month;
}

export default function MonthlyGrowthTable({ data, selectedMetrics }: Props) {
  const recentData = data.slice(-12);

  const activeMetrics = selectedMetrics
    ? ALL_METRICS.filter((m) => selectedMetrics.includes(m.key))
    : ALL_METRICS.slice(0, 2);

  // Enriched data with derived utilization
  const enrichedData = useMemo(() => {
    return recentData.map((d) => {
      const derivedUtilization = d.capa > 0 ? +((d.waferInput / d.capa) * 100).toFixed(1) : d.utilization;
      return { ...d, utilization: derivedUtilization };
    });
  }, [recentData]);

  // Group by year for merged headers
  const yearGroups = useMemo(() => {
    const groups: { year: string; months: MonthlyMetricData[] }[] = [];
    recentData.forEach((d) => {
      const yr = getYear(d.month);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) {
        last.months.push(d);
      } else {
        groups.push({ year: `20${yr}`, months: [d] });
      }
    });
    return groups;
  }, [recentData]);

  if (recentData.length === 0 || activeMetrics.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Year row with colspan */}
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th
                rowSpan={2}
                className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300 whitespace-nowrap align-middle"
              >
                구분
              </th>
              {yearGroups.map((g) => (
                <th
                  key={g.year}
                  colSpan={g.months.length}
                  className="text-center px-1 py-1 border border-gray-200 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200 whitespace-nowrap"
                >
                  {g.year}
                </th>
              ))}
            </tr>
            {/* Month row */}
            <tr className="bg-gray-50 dark:bg-gray-600">
              {recentData.map((d) => (
                <th
                  key={d.month}
                  className="text-center px-1.5 py-1 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300"
                >
                  {getMonthLabel(d.month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeMetrics.map((metric, rowIdx) => (
              <tr
                key={metric.key}
                className={rowIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}
              >
                <td
                  className="px-2 py-1 border border-gray-200 font-medium whitespace-nowrap dark:border-gray-600"
                  style={{ color: metric.color }}
                >
                  {metric.label}
                </td>
                {enrichedData.map((d) => (
                  <td
                    key={d.month}
                    className="px-1.5 py-1 border border-gray-200 text-right tabular-nums whitespace-nowrap text-gray-700 dark:border-gray-600 dark:text-gray-300"
                  >
                    {(d[metric.key] as number).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
