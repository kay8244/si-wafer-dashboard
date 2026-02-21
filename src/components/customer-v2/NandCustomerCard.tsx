'use client';

import { NandCustomerData } from '@/types/nand-customer';
import { formatCurrencyOrNA } from '@/lib/format';
import GrowthIndicator from '../dashboard-v2/GrowthIndicator';

interface NandCustomerCardProps {
  data: NandCustomerData;
  selected?: boolean;
  onSelect?: () => void;
}

export default function NandCustomerCard({ data, selected, onSelect }: NandCustomerCardProps) {
  const { customer, segmentFinancials, latestGrowth, error } = data;
  const latest = segmentFinancials[segmentFinancials.length - 1];

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
      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{customer.nameKo}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{latest.quarter}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {formatCurrencyOrNA(latest.revenue, customer.currency)}
          </p>
          <div className="flex items-center gap-2">
            <GrowthIndicator value={latestGrowth.revenueYoY} label="YoY" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-slate-800">{customer.nameKo}</h3>
          <p className="text-sm text-slate-400">데이터 없음</p>
        </div>
      )}
    </div>
  );
}
