'use client';

import { useState } from 'react';
import type { CustomerDetailId } from '@/types/v2';
import { CUSTOMER_EXECUTIVES } from '@/data/v2/customer-detail-mock';
import { useV2News } from '@/hooks/useV2News';
import CustomerSelector from './CustomerSelector';
import ExecutivePanel from './ExecutivePanel';
import ExternalComparison from './ExternalComparison';
import CustomerNewsPanel from './CustomerNewsPanel';
import WeeklySummary from './WeeklySummary';

export default function CustomerDetailPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailId>('SEC');

  const data = CUSTOMER_EXECUTIVES[selectedCustomer];

  const { articles, answer, loading, error } = useV2News(
    data.newsQueryKo ?? null,
    data.newsQueryEn ?? null,
    data.label,
  );

  const fallbackArticles = data.news.map((n) => ({
    title: n.title,
    url: '#',
    source: n.source,
    publishedDate: null,
  }));

  const newsArticles = data.newsQueryKo ? articles : fallbackArticles;

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">고객 별 현황판</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          대상고객: 메모리 SEC, SKhy, Micron / Foundry SEC, TSMC, SMC, GFS
        </p>
      </div>

      {/* Customer selector */}
      <CustomerSelector
        selectedCustomer={selectedCustomer}
        onSelect={setSelectedCustomer}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Executive panel */}
        <div>
          <ExecutivePanel data={data} />
        </div>

        {/* Right: External comparison + News + Foundry/Mkt */}
        <div className="flex flex-col gap-4">
          <ExternalComparison data={data.externalComparison} />
          <CustomerNewsPanel
            articles={newsArticles}
            answer={answer}
            loading={loading}
            error={error}
          />

          {/* Foundry data & Mkt info inline cards */}
          {(data.foundryData || data.mktInfo) && (
            <div className="flex flex-col gap-2">
              {data.foundryData && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700">Foundry Data</p>
                  <p className="mt-0.5 text-xs text-blue-800">{data.foundryData}</p>
                </div>
              )}
              {data.mktInfo && (
                <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                  <p className="text-xs font-semibold text-green-700">Market Info</p>
                  <p className="mt-0.5 text-xs text-green-800">{data.mktInfo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom full-width weekly summary */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <WeeklySummary
          data={data.weeklySummary}
          foundryData={data.foundryData}
          mktInfo={data.mktInfo}
        />
      </div>
    </div>
  );
}
