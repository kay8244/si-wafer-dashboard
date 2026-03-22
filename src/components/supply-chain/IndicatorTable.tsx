'use client';

import { SupplyChainCategory, SupplyChainIndicator, ViewMode } from '@/types/indicators';

interface IndicatorTableProps {
  category: SupplyChainCategory;
  selectedIndicatorIds: string[];
  onToggleIndicator: (id: string) => void;
  viewMode: ViewMode;
  tableMonths: string[];
}

function formatValue(value: number, unit: string): string {
  if (unit === '%') return value.toFixed(1);
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getMonthlyDisplayValue(
  m: { actual: number; threeMonthMA: number; twelveMonthMA: number; mom: number; yoy: number },
  viewMode: ViewMode,
  unit: string,
): string {
  switch (viewMode) {
    case 'actual':
      return formatValue(m.actual, unit);
    case 'threeMonthMA':
      return formatValue(m.threeMonthMA, unit);
    case 'twelveMonthMA':
      return formatValue(m.twelveMonthMA, unit);
    case 'mom':
      return formatPct(m.mom);
    case 'yoy':
      return formatPct(m.yoy);
  }
}

function getMonthlyRawValue(
  m: { actual: number; threeMonthMA: number; twelveMonthMA: number; mom: number; yoy: number },
  viewMode: ViewMode,
): number {
  switch (viewMode) {
    case 'actual': return m.actual;
    case 'threeMonthMA': return m.threeMonthMA;
    case 'twelveMonthMA': return m.twelveMonthMA;
    case 'mom': return m.mom;
    case 'yoy': return m.yoy;
  }
}

/** Returns color class for MoM/YoY values */
function pctColorClass(value: number): string {
  if (value > 0) return 'text-green-600 font-medium';
  if (value < 0) return 'text-red-600 font-medium';
  return 'text-gray-600';
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  actual: 'Actual',
  threeMonthMA: '3MMA',
  twelveMonthMA: '12MMA',
  mom: 'MoM',
  yoy: 'YoY',
};

const isPctMode = (vm: ViewMode) => vm === 'mom' || vm === 'yoy';

// Multi-select highlight colors by position index
const SELECTION_COLORS = [
  'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700',
  'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-700',
  'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-700',
];

export default function IndicatorTable({
  category,
  selectedIndicatorIds,
  onToggleIndicator,
  viewMode,
  tableMonths,
}: IndicatorTableProps) {
  /** Display short month labels from table months (last 6, e.g. '2025-09' → '25.09') */
  const MONTH_LABELS = tableMonths.map((m) => {
    const [y, mo] = m.split('-');
    return { year: y, month: mo, label: `${y.slice(2)}.${mo}` };
  });

  // Year groups for header
  const yearGroups: { year: string; count: number }[] = [];
  for (const m of MONTH_LABELS) {
    const last = yearGroups[yearGroups.length - 1];
    if (last && last.year === m.year) last.count++;
    else yearGroups.push({ year: m.year, count: 1 });
  }

  // Indices where a new year starts (for vertical border)
  const yearBoundaryIndices = new Set<number>();
  let acc = 0;
  for (const g of yearGroups) {
    if (acc > 0) yearBoundaryIndices.add(acc);
    acc += g.count;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full border-collapse text-base">
        <thead>
          {/* Year row */}
          <tr className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <th className="px-3 py-1.5 text-left font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-600" rowSpan={2}>
              지표명
            </th>
            {yearGroups.map((g) => (
              <th key={g.year} colSpan={g.count} className="px-3 py-1.5 text-center font-bold whitespace-nowrap border-b border-gray-200 dark:border-gray-600">
                {g.year}
              </th>
            ))}
          </tr>
          {/* Month row */}
          <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {MONTH_LABELS.map((m, mi) => (
              <th key={m.label} className={`px-3 py-1.5 text-center font-semibold whitespace-nowrap ${yearBoundaryIndices.has(mi) ? 'border-l border-gray-200 dark:border-gray-600' : ''}`}>
                {m.month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {category.indicators.map((ind: SupplyChainIndicator) => {
            const selIdx = selectedIndicatorIds.indexOf(ind.name);
            const isSelected = selIdx !== -1;
            const rowHighlight = isSelected ? SELECTION_COLORS[selIdx] : '';

            return (
              <tr
                key={ind.id}
                className={`border-b border-gray-100 dark:border-gray-700 ${rowHighlight}`}
              >
                {/* 지표명 — clickable for chart selection */}
                <td
                  className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap cursor-pointer hover:bg-gray-50/70 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  onClick={() => onToggleIndicator(ind.name)}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white dark:bg-gray-500">
                    {ind.id}
                  </span>
                  {ind.name}
                  <span className="ml-1.5 text-gray-400 font-normal">({ind.unit})</span>
                </td>

                {/* Monthly values — driven by viewMode (last 6 months only) */}
                {ind.monthly.slice(-12).map((m, mi) => {
                  const raw = getMonthlyRawValue(m, viewMode);
                  const colorClass = isPctMode(viewMode) ? pctColorClass(raw) : 'text-gray-700 dark:text-gray-300';
                  const yearBorder = yearBoundaryIndices.has(mi) ? 'border-l border-gray-200 dark:border-gray-600' : '';
                  return (
                    <td
                      key={m.month}
                      className={`px-3 py-2.5 text-center tabular-nums cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/50 ${colorClass} ${yearBorder}`}
                      onClick={() => onToggleIndicator(ind.name)}
                    >
                      {getMonthlyDisplayValue(m, viewMode, ind.unit)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer legend */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        월별 표시: <span className="font-semibold text-gray-700 dark:text-gray-300">{VIEW_MODE_LABELS[viewMode]}</span>
        <span className="ml-3 text-gray-400 dark:text-gray-500">| 지표를 클릭하여 최대 3개 선택 (차트에 동시 표시)</span>
      </div>
    </div>
  );
}
