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
import MonthlyMetricsChart from './MonthlyMetricsChart';
import MonthlyGrowthTable from './MonthlyGrowthTable';

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
    categories: n.categories,
  }));

  const newsArticles = data.newsQueryKo ? articles : fallbackArticles;

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">고객 별 현황판</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
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
        {/* Left: Executive panel + Charts + Growth table */}
        <div className="flex flex-col gap-4">
          <ExecutivePanel data={data} />
          <MonthlyMetricsChart data={data.monthlyMetrics} />
          <MonthlyGrowthTable data={data.monthlyMetrics} />
        </div>

        {/* Right: External comparison + News + Foundry/Mkt + Weekly Summary */}
        <div className="flex flex-col gap-4">
          <ExternalComparison data={data.externalComparison} />
          <CustomerNewsPanel
            articles={newsArticles}
            answer={answer}
            loading={loading}
            error={error}
          />
          {/* Foundry data & Mkt info */}
          {(data.foundryData || data.mktInfo) && (
            <div className="flex flex-col gap-2">
              {data.foundryData && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/30">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Foundry Data</p>
                  <p className="mt-0.5 text-xs text-blue-800 dark:text-blue-200">{data.foundryData}</p>
                </div>
              )}
              {data.mktInfo && (
                <div className="rounded-lg border border-green-100 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/30">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">Market Info</p>
                  <p className="mt-0.5 text-xs text-green-800 dark:text-green-200">{data.mktInfo}</p>
                </div>
              )}
            </div>
          )}
          {/* Weekly Summary (editable) */}
          <WeeklySummary
            data={data.weeklySummary}
            customerId={selectedCustomer}
            foundryData={data.foundryData}
            mktInfo={data.mktInfo}
          />
        </div>
      </div>
    </div>
  );
}
