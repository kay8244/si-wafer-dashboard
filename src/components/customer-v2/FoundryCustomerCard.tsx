'use client';

import { FoundryCustomerData } from '@/types/foundry-customer';
import { formatCurrencyOrNA } from '@/lib/format';
import { getGrowthForMetric } from '@/lib/growth';
import { MetricKey } from '@/types/dashboard';
import GrowthIndicator from '../dashboard-v2/GrowthIndicator';

interface FoundryCustomerCardProps {
  data: FoundryCustomerData;
  selected?: boolean;
  onSelect?: () => void;
}

export default function FoundryCustomerCard({ data, selected, onSelect }: FoundryCustomerCardProps) {
  const { customer, segmentFinancials, latestGrowth, error } = data;
  const latest = segmentFinancials[segmentFinancials.length - 1];
  const revenueGrowth = getGrowthForMetric(latestGrowth, 'revenue' as MetricKey);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2' : ''}`}
      style={{
        borderLeftColor: customer.color,
        borderLeftWidth: '4px',
        ...(selected ? { '--tw-ring-color': customer.color } as React.CSSProperties : {}),
      }}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-700">{customer.nameKo}</h3>
        {latest && (
          <p className="mt-0.5 text-xs text-slate-400">{latest.quarter}</p>
        )}
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {formatCurrencyOrNA(latest.revenue as number, customer.currency)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <GrowthIndicator value={revenueGrowth.yoy} label="YoY" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">데이터 없음</p>
      )}
    </div>
  );
}
