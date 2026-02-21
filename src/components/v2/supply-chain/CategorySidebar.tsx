'use client';

import { SupplyChainCategoryId, InternalMetricType } from '@/types/v2';
import { OVERLAY_COLORS } from '@/data/v2/supply-chain-mock';

type SegmentType = 'memory' | 'foundry';

const CATEGORIES: { id: SupplyChainCategoryId; label: string; icon: string }[] = [
  { id: 'wafer', label: 'Wafer', icon: 'W' },
  { id: 'macro', label: 'Macro', icon: 'M' },
  { id: 'application', label: 'Application', icon: 'A' },
  { id: 'semiconductor', label: 'Semiconductor', icon: 'S' },
  { id: 'equipment', label: 'Equipment', icon: 'E' },
];

const MEMORY_COMPANIES = ['SEC', 'SK Hynix', 'Micron'];
const FOUNDRY_COMPANIES = ['SEC', 'TSMC', 'SMIC', 'GFs'];

const METRIC_OPTIONS: { value: InternalMetricType; label: string }[] = [
  { value: 'revenue', label: '매출' },
  { value: 'waferInput', label: '투입량' },
  { value: 'utilization', label: '가동률' },
];

interface CategorySidebarProps {
  selectedCategory: SupplyChainCategoryId;
  onSelect: (id: SupplyChainCategoryId) => void;
  // Internal data overlay props
  segment: SegmentType;
  onSegmentChange: (s: SegmentType) => void;
  selectedCompanies: string[];
  onCompanyToggle: (company: string) => void;
  metric: InternalMetricType;
  onMetricChange: (m: InternalMetricType) => void;
}

export default function CategorySidebar({
  selectedCategory,
  onSelect,
  segment,
  onSegmentChange,
  selectedCompanies,
  onCompanyToggle,
  metric,
  onMetricChange,
}: CategorySidebarProps) {
  const companies = segment === 'memory' ? MEMORY_COMPANIES : FOUNDRY_COMPANIES;

  return (
    <div className="flex w-56 flex-shrink-0 flex-col gap-1 overflow-y-auto">
      {/* ── Category Section ── */}
      <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
        외부 지표
      </p>
      <div className="flex flex-col gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                selectedCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {cat.icon}
            </span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Divider ── */}
      <div className="my-3 border-t border-gray-200" />

      {/* ── Internal Data Overlay Section ── */}
      <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
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
          const color = OVERLAY_COLORS[company] ?? '#64748b';
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
        </div>
      )}
    </div>
  );
}
