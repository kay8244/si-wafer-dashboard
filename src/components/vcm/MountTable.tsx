'use client';

import type { MountPerUnit, TotalWaferDemand } from '@/types/indicators';

interface MountTableProps {
  mountPerUnit: MountPerUnit[];
  totalWaferDemand: TotalWaferDemand[];
  applicationLabel?: string;
  categoryLabel?: string;
  showMountPerUnit?: boolean;
  showTotalWafer?: boolean;
}

export default function MountTable({
  mountPerUnit,
  totalWaferDemand,
  applicationLabel,
  categoryLabel,
  showMountPerUnit = true,
  showTotalWafer = true,
}: MountTableProps) {
  const displayLabel = categoryLabel ?? applicationLabel ?? 'Server';
  const mountYears = mountPerUnit[0]?.metrics.map((m) => m.year) ?? [];
  const waferYears = totalWaferDemand.map((d) => d.year);

  return (
    <div className="flex flex-col gap-3">
      {/* Mount Per Unit */}
      {showMountPerUnit && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="font-semibold text-xs text-gray-700 mb-2 dark:text-gray-300">대당 탑재량 - {displayLabel}</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300">
                  구분
                </th>
                {mountYears.map((year) => (
                  <th
                    key={year}
                    className="text-right px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300"
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mountPerUnit.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                  <td className="px-2 py-1 border border-gray-200 text-gray-700 whitespace-nowrap dark:border-gray-600 dark:text-gray-300">
                    {row.label}
                  </td>
                  {row.metrics.map((m) => (
                    <td
                      key={m.year}
                      className="px-2 py-1 border border-gray-200 text-right text-gray-700 tabular-nums whitespace-nowrap dark:border-gray-600 dark:text-gray-300"
                    >
                      {m.value} {m.unit}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total Wafer Demand */}
      {showTotalWafer && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="font-semibold text-xs text-gray-700 mb-2 dark:text-gray-300">Total Wafer 수요 (Kwsm)</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600 dark:border-gray-600 dark:text-gray-300">
                  구분
                </th>
                {waferYears.map((year) => {
                  const isEstimate = totalWaferDemand.find((d) => d.year === year)?.isEstimate ?? false;
                  return (
                    <th
                      key={year}
                      className="text-right px-2 py-1 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap dark:border-gray-600 dark:text-gray-300"
                    >
                      {year}{isEstimate ? '(E)' : ''}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white dark:bg-gray-800">
                <td className="px-2 py-1 border border-gray-200 text-gray-700 font-medium dark:border-gray-600 dark:text-gray-300">
                  Total
                </td>
                {totalWaferDemand.map((d) => (
                  <td
                    key={d.year}
                    className={`px-2 py-1 border border-gray-200 text-right tabular-nums dark:border-gray-600 ${
                      d.isEstimate ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {d.total.toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
