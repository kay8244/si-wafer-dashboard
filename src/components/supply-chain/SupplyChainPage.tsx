'use client';

import { useState, useCallback, useEffect } from 'react';
import { InternalMetricType, SupplyChainCategoryId, ViewMode } from '@/types/indicators';
import { useSupplyChainData } from '@/hooks/useSupplyChainData';
import CategorySidebar from './CategorySidebar';
import IndicatorTable from './IndicatorTable';
import IndicatorChart from './IndicatorChart';
import ServerLeadingIndicators from './ServerLeadingIndicators';
import MemoryPriceIndicators from './MemoryPriceIndicators';

type SegmentType = 'memory' | 'foundry';

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'actual', label: 'Actual' },
  { value: 'threeMonthMA', label: '3MMA' },
  { value: 'twelveMonthMA', label: '12MMA' },
  { value: 'mom', label: 'MoM' },
  { value: 'yoy', label: 'YoY' },
];

export default function SupplyChainPage() {
  const { data, loading, error } = useSupplyChainData();

  const [selectedCategory, setSelectedCategory] = useState<SupplyChainCategoryId>('macro');
  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('actual');
  const [showServerTab, setShowServerTab] = useState(false);
  const [showMemoryPriceTab, setShowMemoryPriceTab] = useState(false);
  const [overlayData, setOverlayData] = useState<
    { name: string; data: { month: string; value: number }[]; color: string }[]
  >([]);

  // Internal data overlay state (moved from InternalDataPanel)
  const [segment, setSegment] = useState<SegmentType>('memory');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['SEC']);
  const [metric, setMetric] = useState<InternalMetricType>('capa');

  // Set initial indicator once data loads (use name as global key)
  useEffect(() => {
    if (data && selectedIndicatorIds.length === 0) {
      const firstName = data.categories.find((c) => c.id === 'macro')?.indicators[0]?.name;
      if (firstName) setSelectedIndicatorIds([firstName]);
    }
  }, [data, selectedIndicatorIds]);

  // Default to showing SEC CAPA overlay on mount (once data is available)
  useEffect(() => {
    if (data) {
      updateOverlay(['SEC'], 'capa');
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildOverlayData = useCallback(
    (companies: string[], m: InternalMetricType) => {
      if (!data) return [];
      return companies
        .filter((c) => data.internalCompanyData[c])
        .map((c) => ({
          name: `${c} (${m})`,
          data: data.internalCompanyData[c].metrics[m],
          color: data.overlayColors[c] ?? '#64748b',
        }));
    },
    [data],
  );

  const updateOverlay = useCallback(
    (companies: string[], m: InternalMetricType) => {
      if (companies.length === 0) {
        setOverlayData([]);
        return;
      }
      setOverlayData(buildOverlayData(companies, m));
    },
    [buildOverlayData],
  );

  const handleCategorySelect = (id: SupplyChainCategoryId) => {
    setSelectedCategory(id);
    setShowServerTab(false);
    setShowMemoryPriceTab(false);
    // Do NOT reset selected indicators — allow cross-category selection
  };

  const handleIndicatorToggle = (name: string) => {
    setSelectedIndicatorIds((prev) => {
      if (prev.includes(name)) {
        return prev.filter((x) => x !== name);
      }
      if (prev.length < 3) {
        return [...prev, name];
      }
      // Already 3 selected — drop oldest (first), add new
      return [...prev.slice(1), name];
    });
  };

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-500">데이터를 불러올 수 없습니다. {error}</p>
      </div>
    );
  }

  const category = data.categories.find((c) => c.id === selectedCategory) ?? data.categories[0];

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
              {selectedIndicatorIds.length === 1
                ? data.categories.flatMap((c) => c.indicators).find((i) => i.name === selectedIndicatorIds[0])?.unit ?? 'Mixed'
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
          showServerTab={showServerTab}
          onServerTabToggle={setShowServerTab}
          showMemoryPriceTab={showMemoryPriceTab}
          onMemoryPriceTabToggle={setShowMemoryPriceTab}
          segment={segment}
          onSegmentChange={handleSegmentChange}
          selectedCompanies={selectedCompanies}
          onCompanyToggle={handleCompanyToggle}
          metric={metric}
          onMetricChange={handleMetricChange}
          overlayColors={data.overlayColors}
        />

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Content: Server tab or regular indicators */}
          {showServerTab ? (
            <ServerLeadingIndicators indicators={data.serverIndicators} overlayData={overlayData} />
          ) : showMemoryPriceTab ? (
            <MemoryPriceIndicators indicators={data.memoryPriceIndicators} overlayData={overlayData} />
          ) : (
            <>
              {/* Table */}
              <IndicatorTable
                category={category}
                selectedIndicatorIds={selectedIndicatorIds}
                onToggleIndicator={handleIndicatorToggle}
                viewMode={viewMode}
                tableMonths={data.tableMonths}
              />

              {/* Chart — full width */}
              <IndicatorChart
                category={category}
                allCategories={data.categories}
                selectedIndicatorIds={selectedIndicatorIds}
                onToggleIndicator={handleIndicatorToggle}
                viewMode={viewMode}
                overlayData={overlayData}
              />

            </>
          )}
        </div>
      </div>
    </div>
  );
}
