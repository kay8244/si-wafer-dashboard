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

const memoryCustomers = CUSTOMER_LIST.filter((c) => c.type === 'memory');
const foundryCustomers = CUSTOMER_LIST.filter((c) => c.type === 'foundry');
const memoryAll = CUSTOMER_LIST.find((c) => c.id === 'Total_DRAM_NAND');
const foundryAll = CUSTOMER_LIST.find((c) => c.id === 'Total_Foundry');

export default function CustomerDetailPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailId>('SEC');
  const [quarterRange, setQuarterRange] = useState<4 | 8 | 12>(8);

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

  // Build label with type suffix for news panel: "삼성전자 메모리", "TSMC 파운드리"
  const newsLabel = (() => {
    const typeSuffix = data.type === 'memory' ? ' 메모리' : ' 파운드리';
    // Extract clean name: "SEC (삼성전자)" → "삼성전자", "SEC (파운드리)" → "삼성전자", "TSMC" → "TSMC"
    const KNOWN_KOREAN: Record<string, string> = { SEC: '삼성전자', SKHY: 'SK하이닉스' };
    const match = data.label.match(/^(.+?)\s*\((.+?)\)$/);
    let name: string;
    if (match) {
      const [, prefix, inner] = match;
      // If inner is a type descriptor like "파운드리", use known Korean name or prefix
      if (inner === '파운드리' || inner === '메모리') {
        name = KNOWN_KOREAN[prefix.trim()] ?? prefix.trim();
      } else if (/[가-힣]/.test(inner)) {
        name = inner;
      } else {
        name = prefix.trim();
      }
    } else {
      name = data.label;
    }
    return name + typeSuffix;
  })();

  return (
    <div className="flex h-full flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Customer tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        {/* Memory */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">메모리</span>
          {memoryAll && (
            <button
              onClick={() => setSelectedCustomer(memoryAll.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-all ${
                selectedCustomer === memoryAll.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              ALL
            </button>
          )}
          {memoryCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-all ${
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
          <span className="mr-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">파운드리</span>
          {foundryAll && (
            <button
              onClick={() => setSelectedCustomer(foundryAll.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-all ${
                selectedCustomer === foundryAll.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              ALL
            </button>
          )}
          {foundryCustomers.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c.id)}
              className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-all ${
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
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
          <ExecutivePanel data={data} />
          <MonthlyMetricsChart
            data={data.monthlyMetrics}
            prevVersionData={data.monthlyMetricsPrev}
            versionLabel={data.versionLabel}
            prevVersionLabel={data.prevVersionLabel}
            customerType={data.type}
            quarterRange={quarterRange}
            onQuarterRangeChange={setQuarterRange}
          />
          <WeeklySummary
            data={data.weeklySummary}
            customerId={selectedCustomer}
            foundryData={data.foundryData}
            mktInfo={data.mktInfo}
          />
        </div>

        {/* Right */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto p-4">
          <ExternalComparison
            data={data.externalComparison}
            waferInOutData={data.waferInOutQuarterly}
            bitGrowthData={data.bitGrowthQuarterly}
            quarterRange={quarterRange}
            onQuarterRangeChange={setQuarterRange}
            customerType={data.type}
          />
          <CustomerNewsPanel
            articles={newsArticles}
            answer={answer}
            loading={loading}
            error={error}
            customerLabel={newsLabel}
          />
        </div>
      </div>
    </div>
  );
}
