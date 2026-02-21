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
      {/* Sub-tab navigation — underline style */}
      <div className="flex gap-6 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveSubTab('dram')}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeSubTab === 'dram'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          DRAM
        </button>
        <button
          onClick={() => setActiveSubTab('nand')}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeSubTab === 'nand'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          NAND
        </button>
        <button
          onClick={() => setActiveSubTab('foundry')}
          className={`pb-3 text-sm font-medium transition-colors ${
            activeSubTab === 'foundry'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-slate-400 hover:text-slate-600'
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
