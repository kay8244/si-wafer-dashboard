'use client';

import { useState } from 'react';
import type { CustomerDetailId } from '@/types/v3';
import { CUSTOMER_LIST, CUSTOMER_EXECUTIVES } from '@/data/v3/customer-detail-mock';
import { useV2News } from '@/hooks/useV2News';
import ExecutivePanel from './ExecutivePanel';
import ExternalComparison from './ExternalComparison';
import CustomerNewsPanel from './CustomerNewsPanel';
import WeeklySummary from './WeeklySummary';
import MonthlyMetricsChart from './MonthlyMetricsChart';

// Filter out Total_DRAM_NAND aggregate
const CUSTOMERS = CUSTOMER_LIST.filter((c) => c.type !== 'aggregate');
const memoryCustomers = CUSTOMERS.filter((c) => c.type === 'memory');
const foundryCustomers = CUSTOMERS.filter((c) => c.type === 'foundry');

export default function CustomerDetailPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailId>('SEC');
  const [quarterRange, setQuarterRange] = useState<4 | 8 | 12>(4);

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
    <div className="flex h-full flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Customer tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        {/* Memory */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">메모리</span>
          {memoryCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCustomer === c.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
        {/* Foundry */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">파운드리</span>
          {foundryCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCustomer === c.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content — 2/3 center + 1/3 right */}
      <div className="flex min-h-0 flex-1">
        {/* Center (2/3) */}
        <div className="flex w-2/3 flex-col gap-4 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
          <ExecutivePanel data={data} />
          <MonthlyMetricsChart data={data.monthlyMetrics} quarterRange={quarterRange} onQuarterRangeChange={setQuarterRange} />
        </div>

        {/* Right (1/3) */}
        <div className="flex w-1/3 flex-col gap-4 overflow-y-auto p-4">
          <ExternalComparison
            data={data.externalComparison}
            waferInOutData={data.waferInOutQuarterly}
            bitGrowthData={data.bitGrowthQuarterly}
            quarterRange={quarterRange}
            onQuarterRangeChange={setQuarterRange}
          />
          <CustomerNewsPanel
            articles={newsArticles}
            answer={answer}
            loading={loading}
            error={error}
            customerLabel={data.label}
          />
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
