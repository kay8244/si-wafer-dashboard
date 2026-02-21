'use client';

import { useState } from 'react';
import SupplyChainPage from './supply-chain/SupplyChainPage';
import VcmPage from './vcm/VcmPage';
import CustomerDetailPage from './customer-detail/CustomerDetailPage';

type V2Tab = 'supplyChain' | 'vcm' | 'customerDetail';

const TABS: { id: V2Tab; label: string }[] = [
  { id: 'supplyChain', label: '전방시장' },
  { id: 'vcm', label: 'VCM (수요예측)' },
  { id: 'customerDetail', label: '고객별' },
];

export default function V2Container() {
  const [activeTab, setActiveTab] = useState<V2Tab>('supplyChain');

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">V2 현황판</h1>
        <a
          href="/"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
        >
          V1 대시보드 →
        </a>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page Content */}
      {activeTab === 'supplyChain' && <SupplyChainPage />}
      {activeTab === 'vcm' && <VcmPage />}
      {activeTab === 'customerDetail' && <CustomerDetailPage />}
    </div>
  );
}
