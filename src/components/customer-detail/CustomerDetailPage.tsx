'use client';

import { useState, useMemo } from 'react';
import type { CustomerDetailId, IndustryMetric } from '@/types/indicators';
import { useCustomerDetailData } from '@/hooks/useCustomerDetailData';
import { useNews } from '@/hooks/useNews';
import ExecutivePanel from './ExecutivePanel';
import ExternalComparison from './ExternalComparison';
import EstimateTrendChart from './EstimateTrendChart';
import CustomerNewsPanel from './CustomerNewsPanel';
import WeeklySummary from './WeeklySummary';
import MonthlyMetricsChart from './MonthlyMetricsChart';
import FinancialResultsTable from './FinancialResultsTable';
import TranscriptSummary from './TranscriptSummary';
import IndustryMetricsPanel from './IndustryMetricsPanel';
export default function CustomerDetailPage() {
  const { data: apiData, loading, error: apiError } = useCustomerDetailData();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailId>('SEC');
  const [quarterRange, setQuarterRange] = useState<4 | 8 | 12>(8);
  const [showNews, setShowNews] = useState(false);

  const customerList = apiData?.customerList ?? [];
  const memoryCustomers = customerList.filter((c) => c.type === 'memory');
  const foundryCustomers = customerList.filter((c) => c.type === 'foundry');
  const memoryAll = customerList.find((c) => c.id === 'Total_DRAM_NAND');
  const foundryAll = customerList.find((c) => c.id === 'Total_Foundry');

  const data = apiData?.customers[selectedCustomer];

  // Collect unique foundry industry metrics when Total_Foundry is selected (dedupe by metricId)
  const allFoundryMetrics = useMemo((): IndustryMetric[] | undefined => {
    if (selectedCustomer !== 'Total_Foundry' || !apiData?.customers) return undefined;
    const foundryIds = ['SEC_Foundry', 'TSMC', 'SMC', 'GFS', 'STM', 'Intel'] as CustomerDetailId[];
    const seen = new Set<string>();
    const metrics: IndustryMetric[] = [];
    for (const id of foundryIds) {
      const cust = apiData.customers[id];
      if (cust?.industryMetrics && cust.industryMetrics.length > 0) {
        cust.industryMetrics.forEach((m) => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            metrics.push(m);
          }
        });
      }
    }
    return metrics.length > 0 ? metrics : undefined;
  }, [selectedCustomer, apiData]);

  // useNews must be called unconditionally — use safe fallbacks when data not yet loaded
  const { articles, answer, loading: newsLoading, error } = useNews(
    data?.newsQueryKo ?? null,
    data?.newsQueryEn ?? null,
    data?.label,
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (apiError || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-500">데이터를 불러올 수 없습니다. {apiError}</p>
      </div>
    );
  }

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
        <button
          onClick={() => setShowNews(!showNews)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
            showNews
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
          }`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          뉴스
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
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
        <div className="flex w-[70%] flex-col gap-4 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
          <ExecutivePanel data={data} />
          <MonthlyMetricsChart
            data={data.monthlyMetrics}
            prevVersionData={data.monthlyMetricsPrev}
            versionLabel={data.versionLabel}
            prevVersionLabel={data.prevVersionLabel}
            customerType={data.type}
            customerId={selectedCustomer}
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
        <div className="flex w-[30%] flex-col gap-4 overflow-x-auto overflow-y-auto p-4">
          {selectedCustomer !== 'Total_DRAM_NAND' && selectedCustomer !== 'Total_Foundry' && data.financials && data.financials.length > 0 && (
            <FinancialResultsTable financials={data.financials} customerId={selectedCustomer} customerLabel={data.label} />
          )}
          {selectedCustomer !== 'Total_DRAM_NAND' && selectedCustomer !== 'Total_Foundry' && (
            <TranscriptSummary customerId={selectedCustomer} customerLabel={data.label} transcript={data.transcript} />
          )}
          <ExternalComparison
            data={data.externalComparison}
            waferInOutData={data.waferInOutQuarterly}
            bitGrowthData={data.bitGrowthQuarterly}
            quarterRange={quarterRange}
            onQuarterRangeChange={setQuarterRange}
            customerType={data.type}
            customerId={selectedCustomer}
            industryMetrics={selectedCustomer === 'Total_Foundry' ? allFoundryMetrics : data.industryMetrics}
            monthlyMetrics={data.monthlyMetrics}
            customerLabel={data.label}
          />
          {data.estimateTrend && (
            <EstimateTrendChart data={data.estimateTrend} customerId={selectedCustomer} />
          )}
          {showNews && (
            <CustomerNewsPanel
              articles={newsArticles}
              answer={answer}
              loading={newsLoading}
              error={error}
              customerLabel={newsLabel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
