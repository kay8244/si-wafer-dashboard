'use client';

import { useState } from 'react';
import { CompanyId } from '@/types/company';
import { MetricKey } from '@/types/dashboard';
import { COMPANIES, METRICS } from '@/lib/constants';
import { useFinancialData } from '@/hooks/useFinancialData';
import DashboardHeader from './DashboardHeader';
import CompanyOverview from './CompanyOverview';
import MetricComparisonChart from './MetricComparisonChart';
import TrendChart from './TrendChart';
import QuarterlyTable from './QuarterlyTable';
import CompanyNews from './CompanyNews';

export default function DashboardContainer() {
  const { data, loading, error, refresh } = useFinancialData();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('revenue');
  const [selectedCompany, setSelectedCompany] = useState<CompanyId | null>(null);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
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

  return (
    <div>
      <DashboardHeader
        lastUpdated={data.lastUpdated}
        onRefresh={refresh}
        loading={loading}
      />

      {data.errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm font-medium text-yellow-800">일부 데이터 로딩 오류:</p>
          {data.errors.map((err, i) => (
            <p key={i} className="text-xs text-yellow-700">{err}</p>
          ))}
        </div>
      )}

      <CompanyOverview
        companies={data.companies}
        selectedCompanyId={selectedCompany}
        onSelectCompany={(id) =>
          setSelectedCompany((prev) => (prev === id ? null : id))
        }
      />

      {selectedCompany ? (
        <CompanyNews
          companyId={selectedCompany}
          companyName={COMPANIES[selectedCompany].nameKo}
          companyColor={COMPANIES[selectedCompany].color}
          onClose={() => setSelectedCompany(null)}
        />
      ) : (
        <>
          {/* Metric selection tabs */}
          <div className="mb-6 flex gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>

          <MetricComparisonChart companies={data.companies} metric={selectedMetric} />
          <TrendChart companies={data.companies} metric={selectedMetric} />
        </>
      )}

      <QuarterlyTable companies={data.companies} />
    </div>
  );
}
