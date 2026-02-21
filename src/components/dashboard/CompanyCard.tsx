'use client';

import { CompanyFinancialData } from '@/types/company';
import { MetricKey } from '@/types/dashboard';
import { formatCurrencyOrNA } from '@/lib/format';
import { getGrowthForMetric } from '@/lib/growth';
import { METRIC_LABELS } from '@/lib/constants';
import GrowthIndicator from './GrowthIndicator';

interface CompanyCardProps {
  data: CompanyFinancialData;
  selected?: boolean;
  onSelect?: () => void;
}

const METRICS: MetricKey[] = ['revenue', 'operatingIncome', 'netIncome', 'ebitda'];

export default function CompanyCard({ data, selected, onSelect }: CompanyCardProps) {
  const { company, quarterlies, latestGrowth, error } = data;
  const latest = quarterlies[quarterlies.length - 1];

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2' : ''}`}
      style={{
        borderTopColor: company.color,
        borderTopWidth: '3px',
        ...(selected ? { '--tw-ring-color': company.color } as React.CSSProperties : {}),
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{company.nameKo}</h3>
          <p className="text-xs text-gray-400">
            {company.symbol} · {company.exchange} · {company.currency}
          </p>
        </div>
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: company.color }}
        />
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500">
            최신 분기: {latest.quarter}
          </p>
          {METRICS.map((metric) => {
            const growth = getGrowthForMetric(latestGrowth, metric);
            const value = latest[metric];
            return (
              <div key={metric}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{METRIC_LABELS[metric]}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrencyOrNA(value, company.currency)}
                  </span>
                </div>
                {value !== 0 && (
                  <div className="mt-1 flex gap-1.5">
                    <GrowthIndicator value={growth.qoq} label="QoQ" />
                    <GrowthIndicator value={growth.yoy} label="YoY" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400">데이터 없음</p>
      )}
    </div>
  );
}
