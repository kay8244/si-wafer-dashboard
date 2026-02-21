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
          <p className="text-gray-500">NAND 고객 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
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
    <div>
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              NAND 3사 실적 및 지표 분석
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              삼성전자 NAND · SK하이닉스 NAND · Western Digital 세그먼트 실적 비교
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              마지막 업데이트: {formattedDate}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '로딩 중...' : '데이터 새로고침'}
            </button>
          </div>
        </div>
      </header>

      {/* Error warnings */}
      {data.errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
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
          {/* Tab toggle: Financial vs NAND-specific metrics */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab('financial')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                activeTab === 'financial'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              재무실적
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              NAND 지표
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'financial' ? (
            <>
              <NandFinancialChart customers={data.customers} />
              <NandTrendChart customers={data.customers} />
            </>
          ) : selectedMetric ? (
            <NandMetricNews
              metricKey={selectedMetric}
              onClose={() => setSelectedMetric(null)}
            />
          ) : (
            <>
              <NandMetricsChart customers={data.customers} onSelectMetric={setSelectedMetric} />
              <NandCapexChart customers={data.customers} onSelectMetric={setSelectedMetric} />
              <NandLayerChart customers={data.customers} onSelectMetric={setSelectedMetric} />
            </>
          )}
        </>
      )}

      {/* Quarterly detail table */}
      <NandQuarterlyTable customers={data.customers} />
    </div>
  );
}
