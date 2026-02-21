'use client';

import { DramCustomerData } from '@/types/customer';
import { formatCurrencyOrNA } from '@/lib/format';
import { getGrowthForMetric } from '@/lib/growth';
import GrowthIndicator from '../dashboard-v2/GrowthIndicator';

interface DramCustomerCardProps {
  data: DramCustomerData;
  selected?: boolean;
  onSelect?: () => void;
}

export default function DramCustomerCard({ data, selected, onSelect }: DramCustomerCardProps) {
  const { customer, segmentFinancials, dramMetrics, latestGrowth, error } = data;
  const latest = segmentFinancials[segmentFinancials.length - 1];
  const latestMetrics = dramMetrics[dramMetrics.length - 1];

  const revenueGrowth = getGrowthForMetric(latestGrowth, 'revenue');

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md border-l-4 ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        borderLeftColor: customer.color,
        ...(selected ? ({ '--tw-ring-color': customer.color } as React.CSSProperties) : {}),
      }}
    >
      {/* Name */}
      <h3 className="text-base font-semibold text-slate-900 mb-4">{customer.nameKo}</h3>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div className="space-y-3">
          {/* Latest revenue — large number */}
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {formatCurrencyOrNA(latest.revenue, customer.currency)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{latest.quarter} 매출</p>
          </div>

          {/* YoY growth badge */}
          <div className="flex flex-wrap items-center gap-2">
            <GrowthIndicator value={revenueGrowth.yoy} label="YoY" />
            {/* HBM ratio badge if available */}
            {latestMetrics?.hbmRatio != null && (
              <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                HBM {latestMetrics.hbmRatio}%
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">데이터 없음</p>
      )}
    </div>
  );
}
