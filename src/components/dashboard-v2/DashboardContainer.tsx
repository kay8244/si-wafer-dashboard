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
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
          <p className="text-sm text-slate-400">데이터를 불러오는 중...</p>
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
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      <DashboardHeader
        lastUpdated={data.lastUpdated}
        onRefresh={refresh}
        loading={loading}
      />

      {data.errors.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
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
        <div>
          {/* Metric selection tabs — underline style */}
          <div className="mb-6 flex gap-6 border-b border-slate-200">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>

          <MetricComparisonChart companies={data.companies} metric={selectedMetric} />
          <TrendChart companies={data.companies} metric={selectedMetric} />
        </div>
      )}

      <QuarterlyTable companies={data.companies} metric={selectedMetric} />
    </div>
  );
}
