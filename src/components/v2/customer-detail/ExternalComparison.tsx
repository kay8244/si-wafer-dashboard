'use client';

import type { ExternalComparison as ExternalComparisonType } from '@/types/v2';

interface Props {
  data: ExternalComparisonType[];
}

function isHighGap(gap: string): boolean {
  const num = parseFloat(gap.replace('%', ''));
  return !isNaN(num) && num > 10;
}

export default function ExternalComparison({ data }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-0.5 text-sm font-semibold text-gray-800">내외부 정보 비교</h3>
      <p className="mb-3 text-xs text-gray-500">Wafer 수입 정보 및 10% Gap</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-1.5 text-left font-medium text-gray-600">기관</th>
            <th className="pb-1.5 text-right font-medium text-gray-600">Wafer bit/out</th>
            <th className="pb-1.5 text-right font-medium text-gray-600">Bit Growth</th>
            <th className="pb-1.5 text-right font-medium text-gray-600">Gap</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 font-medium text-gray-800">{row.source}</td>
              <td className="py-1.5 text-right text-gray-700">{row.waferBitOut}</td>
              <td className="py-1.5 text-right text-gray-700">{row.bitGrowth}</td>
              <td
                className={`py-1.5 text-right font-semibold ${
                  isHighGap(row.gap) ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {row.gap}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
