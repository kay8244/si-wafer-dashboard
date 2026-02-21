'use client';

import { CompanyFinancialData } from '@/types/company';
import { formatCurrencyOrNA } from '@/lib/format';
import { getGrowthForMetric } from '@/lib/growth';
import GrowthIndicator from './GrowthIndicator';

interface CompanyCardProps {
  data: CompanyFinancialData;
  selected?: boolean;
  onSelect?: () => void;
}

export default function CompanyCard({ data, selected, onSelect }: CompanyCardProps) {
  const { company, quarterlies, latestGrowth, error } = data;
  const latest = quarterlies[quarterlies.length - 1];
  const revenueGrowth = getGrowthForMetric(latestGrowth, 'revenue');

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2' : ''}`}
      style={{
        borderLeftColor: company.color,
        borderLeftWidth: '4px',
        ...(selected ? ({ '--tw-ring-color': company.color } as React.CSSProperties) : {}),
      }}
    >
      {/* Company name + color dot */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{company.nameKo}</h3>
        <div
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: company.color }}
        />
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div className="space-y-3">
          {/* Large revenue number */}
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {formatCurrencyOrNA(latest.revenue, company.currency)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{latest.quarter}</p>
          </div>

          {/* Single YoY growth badge */}
          {latest.revenue !== 0 && (
            <GrowthIndicator value={revenueGrowth.yoy} label="YoY" />
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">데이터 없음</p>
      )}
    </div>
  );
}
