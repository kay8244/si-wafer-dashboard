'use client';

import { SupplyChainCategoryId, InternalMetricType } from '@/types/indicators';

type SegmentType = 'memory' | 'foundry';

const CATEGORIES: { id: SupplyChainCategoryId; label: string; icon: string }[] = [
  { id: 'macro', label: 'Macro', icon: 'M' },
  { id: 'application', label: 'Application', icon: 'A' },
  { id: 'semiconductor', label: 'Semiconductor', icon: 'S' },
  { id: 'equipment', label: 'Equipment', icon: 'E' },
  { id: 'wafer', label: 'Wafer', icon: 'W' },
];

const MEMORY_COMPANIES = ['SEC', 'SK Hynix', 'Micron'];
const FOUNDRY_COMPANIES = ['SEC', 'TSMC', 'SMIC', 'GFs'];

const METRIC_OPTIONS: { value: InternalMetricType; label: string }[] = [
  { value: 'capa', label: 'CAPA' },
  { value: 'waferInput', label: '투입량' },
  { value: 'utilization', label: '가동률' },
];

interface CategorySidebarProps {
  selectedCategory: SupplyChainCategoryId;
  onSelect: (id: SupplyChainCategoryId) => void;
  showServerTab: boolean;
  onServerTabToggle: (show: boolean) => void;
  showMemoryPriceTab: boolean;
  onMemoryPriceTabToggle: (show: boolean) => void;
  // Internal data overlay props
  segment: SegmentType;
  onSegmentChange: (s: SegmentType) => void;
  selectedCompanies: string[];
  onCompanyToggle: (company: string) => void;
  metric: InternalMetricType;
  onMetricChange: (m: InternalMetricType) => void;
  overlayColors: Record<string, string>;
}

export default function CategorySidebar({
  selectedCategory,
  onSelect,
  showServerTab,
  onServerTabToggle,
  showMemoryPriceTab,
  onMemoryPriceTabToggle,
  segment,
  onSegmentChange,
  selectedCompanies,
  onCompanyToggle,
  metric,
  onMetricChange,
  overlayColors,
}: CategorySidebarProps) {
  const companies = segment === 'memory' ? MEMORY_COMPANIES : FOUNDRY_COMPANIES;

  return (
    <div className="flex w-48 flex-shrink-0 flex-col gap-1 overflow-y-auto">
      {/* ── Category Section ── */}
      <p className="px-1 pb-1 text-sm font-bold uppercase tracking-wider text-gray-400">
        외부 지표
        <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-gray-400">
          {(() => {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = now.getMonth() + 1;
            return `${yy}.${mm}월 조사`;
          })()}
        </span>
      </p>
      <div className="flex flex-col gap-1.5">
        {CATEGORIES.map((cat) => (
          <div key={cat.id}>
            {(() => {
              const hasSubTab = (cat.id === 'application' && showServerTab) || (cat.id === 'semiconductor' && showMemoryPriceTab);
              const isActive = selectedCategory === cat.id && !hasSubTab;
              const isParentOfSubTab = selectedCategory === cat.id && hasSubTab;
              return (
                <button
                  onClick={() => { onSelect(cat.id); onServerTabToggle(false); onMemoryPriceTabToggle(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isParentOfSubTab
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                      selectedCategory === cat.id
                        ? isParentOfSubTab ? 'bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-300' : 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {cat.icon}
                  </span>
                  {cat.label}
                </button>
              );
            })()}
            {/* Server 선행지표 sub-button under Application */}
            {cat.id === 'application' && selectedCategory === 'application' && (
              <button
                onClick={() => { onServerTabToggle(true); onMemoryPriceTabToggle(false); }}
                className={`ml-8 mt-1 flex w-[calc(100%-2rem)] items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                  showServerTab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                Server 선행지표
              </button>
            )}
            {/* Memory Price sub-button under Semiconductor */}
            {cat.id === 'semiconductor' && selectedCategory === 'semiconductor' && (
              <button
                onClick={() => { onMemoryPriceTabToggle(true); onServerTabToggle(false); }}
                className={`ml-8 mt-1 flex w-[calc(100%-2rem)] items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${
                  showMemoryPriceTab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                Memory Price
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="my-3 border-t border-gray-200" />

      {/* ── Internal Data Overlay Section ── */}
      <p className="px-1 pb-1 text-sm font-bold uppercase tracking-wider text-gray-400">
        내부 데이터 오버레이
      </p>

      {/* Segment toggle */}
      <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
        <button
          onClick={() => onSegmentChange('memory')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            segment === 'memory'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          메모리
        </button>
        <button
          onClick={() => onSegmentChange('foundry')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            segment === 'foundry'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Foundry
        </button>
      </div>

      {/* Company checkboxes with color indicators */}
      <div className="mt-2 flex flex-col gap-1">
        {companies.map((company) => {
          const isChecked = selectedCompanies.includes(company);
          const color = overlayColors[company] ?? '#64748b';
          return (
            <label
              key={company}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                isChecked ? 'bg-gray-50 font-medium' : 'hover:bg-gray-50/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onCompanyToggle(company)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700">{company}</span>
            </label>
          );
        })}
      </div>

      {/* Metric selector */}
      <div className="mt-2 flex overflow-hidden rounded-lg border border-gray-200 text-sm">
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onMetricChange(opt.value)}
            className={`flex-1 px-2 py-2 font-medium transition-colors ${
              metric === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active overlay summary */}
      {selectedCompanies.length > 0 && (
        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {selectedCompanies.join(', ')}
          </span>
          {' / '}
          {METRIC_OPTIONS.find((o) => o.value === metric)?.label}
          <span className="ml-1 text-gray-400">
            ({metric === 'capa' ? 'K/M' : metric === 'waferInput' ? 'K/M' : '%'})
          </span>
        </div>
      )}
    </div>
  );
}
