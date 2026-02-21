'use client';

import type { MountPerUnit, TotalWaferDemand } from '@/types/v2';

interface MountTableProps {
  mountPerUnit: MountPerUnit[];
  totalWaferDemand: TotalWaferDemand[];
  applicationLabel?: string;
}

export default function MountTable({ mountPerUnit, totalWaferDemand, applicationLabel }: MountTableProps) {
  // Use years from totalWaferDemand for Total Wafer table (2019~2026)
  // Use years from mountPerUnit metrics for Mount table (2023~2026)
  const mountYears = mountPerUnit[0]?.metrics.map((m) => m.year) ?? [];
  const waferYears = totalWaferDemand.map((d) => d.year);

  return (
    <div className="flex flex-col gap-3">
      {/* Mount Per Unit */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <h3 className="font-semibold text-xs text-gray-700 mb-2">대당 탑재량 - {applicationLabel || 'Server'}</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600">
                구분
              </th>
              {mountYears.map((year) => (
                <th
                  key={year}
                  className="text-right px-2 py-1 border border-gray-200 font-semibold text-gray-600"
                >
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mountPerUnit.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-1 border border-gray-200 text-gray-700 whitespace-nowrap">
                  {row.label}
                </td>
                {row.metrics.map((m) => (
                  <td
                    key={m.year}
                    className="px-2 py-1 border border-gray-200 text-right text-gray-700 tabular-nums whitespace-nowrap"
                  >
                    {m.value} {m.unit}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Wafer Demand */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <h3 className="font-semibold text-xs text-gray-700 mb-2">Total Wafer 수요 (Kwsm)</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1 border border-gray-200 font-semibold text-gray-600">
                구분
              </th>
              {waferYears.map((year) => {
                const isEstimate = totalWaferDemand.find((d) => d.year === year)?.isEstimate ?? false;
                return (
                  <th
                    key={year}
                    className="text-right px-2 py-1 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {year}{isEstimate ? '(E)' : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="px-2 py-1 border border-gray-200 text-gray-700 font-medium">
                Total
              </td>
              {totalWaferDemand.map((d) => (
                <td
                  key={d.year}
                  className={`px-2 py-1 border border-gray-200 text-right tabular-nums ${
                    d.isEstimate ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {d.total.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
