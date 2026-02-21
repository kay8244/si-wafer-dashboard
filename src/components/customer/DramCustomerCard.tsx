'use client';

import { DramCustomerData } from '@/types/customer';
import { formatCurrencyOrNA, formatPercent } from '@/lib/format';
import { DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import GrowthIndicator from '../dashboard/GrowthIndicator';
import { getGrowthForMetric } from '@/lib/growth';
import { MetricKey } from '@/types/dashboard';

interface DramCustomerCardProps {
  data: DramCustomerData;
  selected?: boolean;
  onSelect?: () => void;
}

export default function DramCustomerCard({ data, selected, onSelect }: DramCustomerCardProps) {
  const { customer, segmentFinancials, dramMetrics, latestGrowth, error } = data;
  const latest = segmentFinancials[segmentFinancials.length - 1];
  const latestMetrics = dramMetrics[dramMetrics.length - 1];

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        onSelect ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2' : ''}`}
      style={{
        borderTopColor: customer.color,
        borderTopWidth: '3px',
        ...(selected ? { '--tw-ring-color': customer.color } as React.CSSProperties : {}),
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{customer.nameKo}</h3>
          <p className="text-xs text-gray-400">
            {customer.symbol} · {customer.currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestMetrics?.hbmRatio != null && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              HBM {latestMetrics.hbmRatio}%
            </span>
          )}
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: customer.color }}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : latest ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500">
            최신 분기: {latest.quarter}
          </p>
          {DRAM_FINANCIAL_METRICS.map(({ key, labelKo }) => {
            const growth = getGrowthForMetric(latestGrowth, key as MetricKey);
            const value = latest[key as keyof typeof latest] as number;
            return (
              <div key={key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{labelKo}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrencyOrNA(value, customer.currency)}
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
          {/* DRAM-specific metrics summary */}
          {latestMetrics && (
            <div className="mt-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {latestMetrics.utilizationRate != null && (
                  <div>
                    <span className="text-gray-400">가동률</span>
                    <span className="ml-1 font-semibold text-gray-700">{latestMetrics.utilizationRate}%</span>
                  </div>
                )}
                {latestMetrics.inventoryDays != null && (
                  <div>
                    <span className="text-gray-400">재고일수</span>
                    <span className="ml-1 font-semibold text-gray-700">{latestMetrics.inventoryDays}일</span>
                  </div>
                )}
                {latestMetrics.aspChangeQoQ != null && (
                  <div>
                    <span className="text-gray-400">ASP QoQ</span>
                    <span className={`ml-1 font-semibold ${latestMetrics.aspChangeQoQ >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(latestMetrics.aspChangeQoQ)}
                    </span>
                  </div>
                )}
                {latestMetrics.bitShipmentGrowthQoQ != null && (
                  <div>
                    <span className="text-gray-400">Bit QoQ</span>
                    <span className={`ml-1 font-semibold ${latestMetrics.bitShipmentGrowthQoQ >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(latestMetrics.bitShipmentGrowthQoQ)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">데이터 없음</p>
      )}
    </div>
  );
}
