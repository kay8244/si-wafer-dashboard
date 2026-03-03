'use client';

interface DemandTableRow {
  application: string;
  yearly: { year: number; value: number; isEstimate: boolean }[];
}

interface DemandTableProps {
  data: DemandTableRow[];
}

export default function DemandTable({ data }: DemandTableProps) {
  if (data.length === 0) return null;

  const years = data[0].yearly.map((y) => y.year);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 overflow-x-auto">
      <h3 className="font-semibold text-sm text-gray-800 mb-2">Application 수요 (단위: K)</h3>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-2 py-1.5 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap">
              Application
            </th>
            {years.map((year) => {
              const isEstimate = data[0].yearly.find((y) => y.year === year)?.isEstimate ?? false;
              return (
                <th
                  key={year}
                  className="text-right px-2 py-1.5 border border-gray-200 font-semibold text-gray-600 whitespace-nowrap"
                >
                  {year}{isEstimate ? '(E)' : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-2 py-1.5 border border-gray-200 text-gray-700 whitespace-nowrap">
                {row.application}
              </td>
              {row.yearly.map((y) => (
                <td
                  key={y.year}
                  className={`px-2 py-1.5 border border-gray-200 text-right tabular-nums ${
                    y.isEstimate ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {y.value.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
