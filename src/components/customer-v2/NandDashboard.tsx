'use client';

import { useState } from 'react';
import { NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NandMetricKey } from '@/lib/nand-constants';
import { useNandCustomerData } from '@/hooks/useNandCustomerData';
import NandCustomerOverview from './NandCustomerOverview';
import NandCustomerNews from './NandCustomerNews';
import NandMetricNews from './NandMetricNews';
import NandFinancialChart from './NandFinancialChart';
import NandTrendChart from './NandTrendChart';
import NandMetricsChart from './NandMetricsChart';
import NandCapexChart from './NandCapexChart';
import NandLayerChart from './NandLayerChart';
import NandQuarterlyTable from './NandQuarterlyTable';

type NandTab = 'financial' | 'metrics';

export default function NandDashboard() {
  const { data, loading, error, refresh } = useNandCustomerData();
  const [activeTab, setActiveTab] = useState<NandTab>('financial');
  const [selectedCustomer, setSelectedCustomer] = useState<NandCustomerId | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<NandMetricKey | null>(null);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-slate-500">NAND 고객 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={refresh}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
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
    <div className="space-y-10">
      {/* Header */}
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              NAND 고객사 대시보드
            </h1>
            <p className="mt-1 text-xs text-slate-400">마지막 업데이트: {formattedDate}</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '로딩 중...' : '데이터 새로고침'}
          </button>
        </div>
      </header>

      {/* Error warnings */}
      {data.errors.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-800">일부 데이터 로딩 오류:</p>
          {data.errors.map((err, i) => (
            <p key={i} className="text-xs text-yellow-700">{err}</p>
          ))}
        </div>
      )}

      {/* 3-company overview cards */}
      <NandCustomerOverview
        customers={data.customers}
        selectedCustomerId={selectedCustomer}
        onSelectCustomer={(id) =>
          setSelectedCustomer((prev) => (prev === id ? null : id))
        }
      />

      {selectedCustomer ? (
        <NandCustomerNews
          customerId={selectedCustomer}
          companyName={NAND_CUSTOMERS[selectedCustomer].nameKo}
          companyColor={NAND_CUSTOMERS[selectedCustomer].color}
          onClose={() => setSelectedCustomer(null)}
        />
      ) : (
        <>
          {/* Tab toggle: underline style */}
          <div className="flex gap-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('financial')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'financial'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              재무실적
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              NAND 지표
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'financial' ? (
            <div className="space-y-10">
              <NandFinancialChart customers={data.customers} />
              <NandTrendChart customers={data.customers} />
            </div>
          ) : selectedMetric ? (
            <NandMetricNews
              metricKey={selectedMetric}
              onClose={() => setSelectedMetric(null)}
            />
          ) : (
            <div className="space-y-10">
              <NandMetricsChart customers={data.customers} onSelectMetric={setSelectedMetric} />
              <NandCapexChart customers={data.customers} onSelectMetric={setSelectedMetric} />
              <NandLayerChart customers={data.customers} onSelectMetric={setSelectedMetric} />
            </div>
          )}
        </>
      )}

      {/* Quarterly detail table */}
      <NandQuarterlyTable customers={data.customers} />
    </div>
  );
}
