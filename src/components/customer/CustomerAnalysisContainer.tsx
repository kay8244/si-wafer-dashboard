'use client';

import { useState } from 'react';
import DramDashboard from './DramDashboard';
import NandDashboard from './NandDashboard';
import FoundryDashboard from './FoundryDashboard';

type SubTab = 'dram' | 'nand' | 'foundry';

export default function CustomerAnalysisContainer() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dram');

  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveSubTab('dram')}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            activeSubTab === 'dram'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          DRAM
        </button>
        <button
          onClick={() => setActiveSubTab('nand')}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            activeSubTab === 'nand'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          NAND
        </button>
        <button
          onClick={() => setActiveSubTab('foundry')}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
            activeSubTab === 'foundry'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          파운드리
        </button>
      </div>

      {activeSubTab === 'dram' && <DramDashboard />}
      {activeSubTab === 'nand' && <NandDashboard />}
      {activeSubTab === 'foundry' && <FoundryDashboard />}
    </div>
  );
}
