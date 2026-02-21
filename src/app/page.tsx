'use client';

import { useState } from 'react';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import CustomerAnalysisContainer from '@/components/customer/CustomerAnalysisContainer';

type TopTab = 'competitor' | 'customer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TopTab>('competitor');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* V2 Link */}
      <div className="mb-4 flex justify-end">
        <a
          href="/v2"
          className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          V2 현황판 →
        </a>
      </div>

      {/* Top-level Tab Navigation */}
      <div className="mb-8 flex gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('competitor')}
          className={`flex-1 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'competitor'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          경쟁사 분석
        </button>
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex-1 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'customer'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          고객 분석
        </button>
      </div>

      {activeTab === 'competitor' ? (
        <DashboardContainer />
      ) : (
        <CustomerAnalysisContainer />
      )}
    </main>
  );
}
