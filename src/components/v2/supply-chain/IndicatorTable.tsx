'use client';

import { useState } from 'react';
import { SupplyChainCategory, SupplyChainIndicator, ViewMode, LeadingIndicatorRating } from '@/types/v2';
import { TABLE_MONTHS } from '@/data/v2/supply-chain-mock';

interface IndicatorTableProps {
  category: SupplyChainCategory;
  selectedIndicatorId: string | null;
  onSelectIndicator: (id: string | null) => void;
  viewMode: ViewMode;
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

function ratingColor(rating: 'positive' | 'neutral' | 'negative'): string {
  if (rating === 'positive') return 'bg-green-500';
  if (rating === 'negative') return 'bg-red-500';
  return 'bg-yellow-400';
}

function leadingRatingBadge(r: LeadingIndicatorRating): string {
  if (r === '상') return 'bg-green-100 text-green-800';
  if (r === '중') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
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

/** Display short month labels from table months (last 6, e.g. '2025-09' → '25.09') */
const MONTH_LABELS = TABLE_MONTHS.map((m) => {
  const [y, mo] = m.split('-');
  return `${y.slice(2)}.${mo}`;
});

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  actual: 'Actual',
  threeMonthMA: '3MMA',
  twelveMonthMA: '12MMA',
  mom: 'MoM',
  yoy: 'YoY',
};

const isPctMode = (vm: ViewMode) => vm === 'mom' || vm === 'yoy';

export default function IndicatorTable({
  category,
  selectedIndicatorId,
  onSelectIndicator,
  viewMode,
}: IndicatorTableProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    onSelectIndicator(selectedIndicatorId === id ? null : id);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-600">
            <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
              지표명
            </th>
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                {label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">반기평가</th>
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">평가</th>
          </tr>
        </thead>
        <tbody>
          {category.indicators.map((ind: SupplyChainIndicator) => {
            const isSelected = selectedIndicatorId === ind.id;
            const isHovered = hoveredId === ind.id;

            return (
              <tr
                key={ind.id}
                onClick={() => handleRowClick(ind.id)}
                onMouseEnter={() => setHoveredId(ind.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected
                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                    : 'hover:bg-gray-50/70'
                }`}
              >
                {/* 지표명 + 판단 툴팁 */}
                <td className="relative px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white">
                    {ind.id}
                  </span>
                  {ind.name}
                  <span className="ml-1.5 text-gray-400 font-normal">({ind.unit})</span>
                  {/* 호버 툴팁 - 판단 텍스트 */}
                  {isHovered && ind.judgment && (
                    <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-normal text-gray-700 shadow-lg">
                      <span className="mb-1 block text-xs font-semibold text-gray-500">판단</span>
                      {ind.judgment}
                    </div>
                  )}
                </td>

                {/* Monthly values — driven by viewMode (last 6 months only) */}
                {ind.monthly.slice(-6).map((m) => {
                  const raw = getMonthlyRawValue(m, viewMode);
                  const colorClass = isPctMode(viewMode) ? pctColorClass(raw) : 'text-gray-700';
                  return (
                    <td
                      key={m.month}
                      className={`px-3 py-2.5 text-center tabular-nums ${colorClass}`}
                    >
                      {getMonthlyDisplayValue(m, viewMode, ind.unit)}
                    </td>
                  );
                })}

                {/* 반기평가 */}
                <td className="px-3 py-2.5 text-center">
                  {ind.semiAnnualEval ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${ratingColor(ind.semiAnnualEval.rating)}`}
                      />
                      <span
                        className={`tabular-nums font-medium ${
                          ind.semiAnnualEval.value > 0
                            ? 'text-green-600'
                            : ind.semiAnnualEval.value < 0
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {formatPct(ind.semiAnnualEval.value)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* 지표 평가 */}
                <td className="px-3 py-2.5 text-center">
                  {ind.leadingRating ? (
                    <span
                      className={`inline-block rounded-md px-2.5 py-1 text-sm font-bold ${leadingRatingBadge(ind.leadingRating)}`}
                    >
                      {ind.leadingRating}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Footer legend */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-sm text-gray-500">
        월별 표시: <span className="font-semibold text-gray-700">{VIEW_MODE_LABELS[viewMode]}</span>
        <span className="ml-3 text-gray-400">| 지표명에 마우스를 올리면 판단을 확인할 수 있습니다</span>
      </div>
    </div>
  );
}
