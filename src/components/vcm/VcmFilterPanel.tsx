'use client';

import type { VcmVersion, AppCategoryItem, DeviceFilterItem } from '@/types/indicators';

interface VcmFilterPanelProps {
  version: string;
  setVersion: (v: string) => void;
  versions: VcmVersion[];
  appCategories: AppCategoryItem[];
  setAppCategories: (categories: AppCategoryItem[]) => void;
  deviceFilters: DeviceFilterItem[];
  setDeviceFilters: (filters: DeviceFilterItem[]) => void;
}

export default function VcmFilterPanel({
  version,
  setVersion,
  versions,
  appCategories,
  setAppCategories,
  deviceFilters,
  setDeviceFilters,
}: VcmFilterPanelProps) {
  function selectCategory(index: number) {
    const updated = appCategories.map((item, i) => ({
      ...item,
      checked: i === index,
    }));
    setAppCategories(updated);
  }

  function toggleDevice(index: number) {
    const updated = deviceFilters.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item,
    );
    setDeviceFilters(updated);
  }

  const primaryCategoryLabel = appCategories.find((f) => f.checked)?.label ?? '';

  return (
    <div className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400">조회 조건</p>

      {/* VCM Version */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Version</label>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Application — radio-style single selection (5 categories) */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Application</p>
        <div className="flex flex-col gap-1">
          {appCategories.map((item, i) => (
            <button
              key={item.category}
              onClick={() => selectCategory(i)}
              className={`rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-all ${
                item.checked
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Devices — multi-select checkboxes (6 devices) */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Devices</p>
        <div className="flex flex-col gap-1">
          {deviceFilters.map((item, i) => (
            <label
              key={item.type}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleDevice(i)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-auto border-t border-gray-200 pt-3 dark:border-gray-700">
        <p className="text-[10px] leading-tight text-gray-400 dark:text-gray-500">
          {primaryCategoryLabel}의 DRAM/HBM/NAND 선택
        </p>
      </div>
    </div>
  );
}
