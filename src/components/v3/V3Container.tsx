'use client';

import { useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import SupplyChainPage from './supply-chain/SupplyChainPage';
import VcmPage from './vcm/VcmPage';
import CustomerDetailPage from './customer-detail/CustomerDetailPage';

type V3Tab = 'supplyChain' | 'vcm' | 'customerDetail';

const TABS: { id: V3Tab; label: string }[] = [
  { id: 'supplyChain', label: '전방시장' },
  { id: 'vcm', label: 'VCM (수요예측)' },
  { id: 'customerDetail', label: '고객별' },
];

export default function V3Container() {
  const [activeTab, setActiveTab] = useState<V3Tab>('supplyChain');
  const { isDark, toggle } = useDarkMode();

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-6 py-1.5 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            title={isDark ? '라이트 모드' : '다크 모드'}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <a
            href="/v2"
            className="rounded-md bg-blue-50 px-2.5 py-1.5 text-center text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            v2
          </a>
        </div>
      </div>

      {/* Page Content */}
      {activeTab === 'supplyChain' && <SupplyChainPage />}
      {activeTab === 'vcm' && <VcmPage />}
      {activeTab === 'customerDetail' && <CustomerDetailPage />}
    </div>
  );
}
