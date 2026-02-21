'use client';

import { useState } from 'react';
import { DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DramMetricKey } from '@/lib/customer-constants';
import { useDramCustomerData } from '@/hooks/useDramCustomerData';
import DramCustomerOverview from './DramCustomerOverview';
import DramCustomerNews from './DramCustomerNews';
import DramMetricNews from './DramMetricNews';
import DramFinancialChart from './DramFinancialChart';
import DramTrendChart from './DramTrendChart';
import DramMetricsChart from './DramMetricsChart';
import DramCapexChart from './DramCapexChart';
import DramTechNodeChart from './DramTechNodeChart';
import DramQuarterlyTable from './DramQuarterlyTable';

type DramTab = 'financial' | 'metrics';

export default function DramDashboard() {
  const { data, loading, error, refresh } = useDramCustomerData();
  const [activeTab, setActiveTab] = useState<DramTab>('financial');
  const [selectedCustomer, setSelectedCustomer] = useState<DramCustomerId | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<DramMetricKey | null>(null);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-slate-500">DRAM 고객 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formattedDate = new Date(data.lastUpdated).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              DRAM 고객사 대시보드
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              마지막 업데이트: {formattedDate}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '로딩 중...' : '새로고침'}
          </button>
        </div>
      </header>

      {/* Error warnings */}
      {data.errors.length > 0 && (
        <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">일부 데이터 로딩 오류:</p>
          {data.errors.map((err, i) => (
            <p key={i} className="text-xs text-yellow-700">{err}</p>
          ))}
        </div>
      )}

      {/* 3-company overview cards */}
      <DramCustomerOverview
        customers={data.customers}
        selectedCustomerId={selectedCustomer}
        onSelectCustomer={(id) =>
          setSelectedCustomer((prev) => (prev === id ? null : id))
        }
      />

      {selectedCustomer ? (
        <DramCustomerNews
          customerId={selectedCustomer}
          companyName={DRAM_CUSTOMERS[selectedCustomer].nameKo}
          companyColor={DRAM_CUSTOMERS[selectedCustomer].color}
          onClose={() => setSelectedCustomer(null)}
        />
      ) : (
        <>
          {/* Tab toggle: Financial vs DRAM-specific metrics — underline style */}
          <div className="flex gap-6 border-b border-slate-200 mb-8">
            <button
              onClick={() => setActiveTab('financial')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'financial'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              재무지표
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              DRAM 특화지표
            </button>
          </div>

          {/* Tab content */}
          <div className="space-y-10">
            {activeTab === 'financial' ? (
              <>
                <DramFinancialChart customers={data.customers} />
                <DramTrendChart customers={data.customers} />
              </>
            ) : selectedMetric ? (
              <DramMetricNews
                metricKey={selectedMetric}
                onClose={() => setSelectedMetric(null)}
              />
            ) : (
              <>
                <DramMetricsChart customers={data.customers} onSelectMetric={setSelectedMetric} />
                <DramCapexChart customers={data.customers} onSelectMetric={setSelectedMetric} />
                <DramTechNodeChart customers={data.customers} onSelectMetric={setSelectedMetric} />
              </>
            )}
          </div>
        </>
      )}

      {/* Quarterly detail table */}
      <div className="mt-10">
        <DramQuarterlyTable customers={data.customers} />
      </div>
    </div>
  );
}
