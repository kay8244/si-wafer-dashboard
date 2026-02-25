'use client';

import { useState, useCallback } from 'react';
import { InternalMetricType, SupplyChainCategoryId, ViewMode } from '@/types/v2';
import { SUPPLY_CHAIN_CATEGORIES, buildOverlayData } from '@/data/v2/supply-chain-mock';
import CategorySidebar from './CategorySidebar';
import IndicatorTable from './IndicatorTable';
import IndicatorChart from './IndicatorChart';

type SegmentType = 'memory' | 'foundry';

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'actual', label: 'Actual' },
  { value: 'threeMonthMA', label: '3MMA' },
  { value: 'twelveMonthMA', label: '12MMA' },
  { value: 'mom', label: 'MoM' },
  { value: 'yoy', label: 'YoY' },
];

export default function SupplyChainPage() {
  const [selectedCategory, setSelectedCategory] = useState<SupplyChainCategoryId>('macro');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(
    SUPPLY_CHAIN_CATEGORIES.find((c) => c.id === 'macro')?.indicators[0]?.id ?? null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [overlayData, setOverlayData] = useState<
    { name: string; data: { month: string; value: number }[]; color: string }[]
  >([]);

  // Internal data overlay state (moved from InternalDataPanel)
  const [segment, setSegment] = useState<SegmentType>('memory');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['SEC']);
  const [metric, setMetric] = useState<InternalMetricType>('revenue');

  const category = SUPPLY_CHAIN_CATEGORIES.find((c) => c.id === selectedCategory)!;

  const handleCategorySelect = (id: SupplyChainCategoryId) => {
    setSelectedCategory(id);
    const cat = SUPPLY_CHAIN_CATEGORIES.find((c) => c.id === id);
    setSelectedIndicatorId(cat?.indicators[0]?.id ?? null);
  };

  const updateOverlay = useCallback(
    (companies: string[], m: InternalMetricType) => {
      if (companies.length === 0) {
        setOverlayData([]);
        return;
      }
      setOverlayData(buildOverlayData(companies, m));
    },
    [],
  );

  const handleSegmentChange = (s: SegmentType) => {
    setSegment(s);
    const next = ['SEC'];
    setSelectedCompanies(next);
    updateOverlay(next, metric);
  };

  const handleCompanyToggle = (company: string) => {
    const next = selectedCompanies.includes(company)
      ? selectedCompanies.filter((c) => c !== company)
      : [...selectedCompanies, company];
    setSelectedCompanies(next);
    updateOverlay(next, metric);
  };

  const handleMetricChange = (m: InternalMetricType) => {
    setMetric(m);
    updateOverlay(selectedCompanies, m);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3.5 shadow-md">
        <h2 className="text-lg font-bold text-gray-900">Supply Chain 별 현황판</h2>

        <div className="flex items-center gap-5">
          {/* Unit label */}
          <span className="text-sm text-gray-500">
            Unit:&nbsp;
            <span className="font-medium text-gray-700">
              {selectedIndicatorId
                ? category.indicators.find((i) => i.id === selectedIndicatorId)?.unit ?? 'Mixed'
                : 'Mixed'}
            </span>
          </span>

          {/* ViewMode selector */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
            {VIEW_MODES.map((vm) => (
              <button
                key={vm.value}
                onClick={() => setViewMode(vm.value)}
                className={`px-4 py-2 font-medium transition-colors ${
                  viewMode === vm.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5">
        {/* Left sidebar — category + internal data controls */}
        <CategorySidebar
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
          segment={segment}
          onSegmentChange={handleSegmentChange}
          selectedCompanies={selectedCompanies}
          onCompanyToggle={handleCompanyToggle}
          metric={metric}
          onMetricChange={handleMetricChange}
        />

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Table */}
          <IndicatorTable
            category={category}
            selectedIndicatorId={selectedIndicatorId}
            onSelectIndicator={setSelectedIndicatorId}
            viewMode={viewMode}
          />

          {/* Chart — full width */}
          <IndicatorChart
            category={category}
            selectedIndicatorId={selectedIndicatorId}
            viewMode={viewMode}
            overlayData={overlayData}
          />
        </div>
      </div>
    </div>
  );
}
