'use client';

import { useState, useCallback } from 'react';
import { SupplyChainCategory, SupplyChainIndicator, ViewMode, LeadingIndicatorRating } from '@/types/indicators';
import { TABLE_MONTHS } from '@/data/supply-chain-mock';

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

function leadingRatingBadge(r: LeadingIndicatorRating): { bg: string; text: string } {
  switch (r) {
    case '상':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case '중상':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
    case '중':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case '중하':
      return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case '하':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
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
  const [hoveredRatingId, setHoveredRatingId] = useState<string | null>(null);
  const [editingJudgment, setEditingJudgment] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    onSelectIndicator(selectedIndicatorId === id ? null : id);
  };

  const handleJudgmentEdit = useCallback((indicatorId: string, currentJudgment: string) => {
    setEditingId(indicatorId);
    setEditingJudgment((prev) => ({
      ...prev,
      [indicatorId]: prev[indicatorId] ?? currentJudgment,
    }));
  }, []);

  const handleJudgmentSave = useCallback((indicatorId: string) => {
    setEditingId(null);
    // Value is persisted in local state (editingJudgment)
  }, []);

  const getJudgment = useCallback((ind: SupplyChainIndicator): string => {
    return editingJudgment[ind.id] ?? ind.judgment ?? '';
  }, [editingJudgment]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
              지표명
            </th>
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                {label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">반기평가</th>
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">지표평가</th>
          </tr>
        </thead>
        <tbody>
          {category.indicators.map((ind: SupplyChainIndicator) => {
            const isSelected = selectedIndicatorId === ind.id;
            const judgmentText = getJudgment(ind);
            const isEditing = editingId === ind.id;

            return (
              <tr
                key={ind.id}
                className={`border-b border-gray-100 dark:border-gray-700 ${
                  isSelected
                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700'
                    : ''
                }`}
              >
                {/* 지표명 — clickable for chart selection */}
                <td
                  className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap cursor-pointer hover:bg-gray-50/70 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  onClick={() => handleRowClick(ind.id)}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs font-bold text-white dark:bg-gray-500">
                    {ind.id}
                  </span>
                  {ind.name}
                  <span className="ml-1.5 text-gray-400 font-normal">({ind.unit})</span>
                </td>

                {/* Monthly values — driven by viewMode (last 6 months only) */}
                {ind.monthly.slice(-6).map((m) => {
                  const raw = getMonthlyRawValue(m, viewMode);
                  const colorClass = isPctMode(viewMode) ? pctColorClass(raw) : 'text-gray-700 dark:text-gray-300';
                  return (
                    <td
                      key={m.month}
                      className={`px-3 py-2.5 text-center tabular-nums cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/50 ${colorClass}`}
                      onClick={() => handleRowClick(ind.id)}
                    >
                      {getMonthlyDisplayValue(m, viewMode, ind.unit)}
                    </td>
                  );
                })}

                {/* 반기평가 */}
                <td className="px-3 py-2.5 text-center" onClick={() => handleRowClick(ind.id)}>
                  {ind.semiAnnualEval ? (
                    <span className="inline-flex items-center gap-1.5 cursor-pointer">
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

                {/* 지표평가 — with tooltip */}
                <td className="px-3 py-2.5 text-center">
                  {ind.leadingRating ? (
                    <div
                      className="relative inline-block"
                      onMouseEnter={() => setHoveredRatingId(ind.id)}
                      onMouseLeave={() => setHoveredRatingId(null)}
                    >
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-sm font-bold cursor-default ${leadingRatingBadge(ind.leadingRating).bg} ${leadingRatingBadge(ind.leadingRating).text}`}
                      >
                        {ind.leadingRating}
                      </span>
                      {/* Rating tooltip */}
                      {hoveredRatingId === ind.id && ind.ratingReason && (
                        <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-normal text-gray-700 shadow-xl dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <span className="mb-0.5 block text-[11px] font-bold text-gray-400 uppercase tracking-wide">평가 근거</span>
                          {ind.ratingReason}
                        </div>
                      )}
                    </div>
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
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        월별 표시: <span className="font-semibold text-gray-700 dark:text-gray-300">{VIEW_MODE_LABELS[viewMode]}</span>
        <span className="ml-3 text-gray-400 dark:text-gray-500">| 지표평가에 마우스를 올리면 평가 근거를 확인할 수 있습니다</span>
      </div>
    </div>
  );
}
