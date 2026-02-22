'use client';

import { useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import CustomerAnalysisContainer from '@/components/customer/CustomerAnalysisContainer';

type TopTab = 'competitor' | 'customer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TopTab>('competitor');
  const { isDark, toggle } = useDarkMode();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top bar: V2 link + Dark mode toggle */}
      <div className="mb-4 flex items-center justify-end gap-3">
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100"
          title={isDark ? '라이트 모드' : '다크 모드'}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
            </svg>
          )}
        </button>
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
