'use client';

import type { VcmVersion, ApplicationFilterItem } from '@/types/v2';

interface VcmFilterPanelProps {
  version: string;
  setVersion: (v: string) => void;
  versions: VcmVersion[];
  applicationFilters: ApplicationFilterItem[];
  setApplicationFilters: (filters: ApplicationFilterItem[]) => void;
}

export default function VcmFilterPanel({
  version,
  setVersion,
  versions,
  applicationFilters,
  setApplicationFilters,
}: VcmFilterPanelProps) {
  function selectApplication(index: number) {
    const updated = applicationFilters.map((item, i) => ({
      ...item,
      checked: i === index,
    }));
    setApplicationFilters(updated);
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-5 overflow-y-auto border-r border-gray-200 bg-white p-4">
      {/* VCM Version */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">VCM Version</label>
        <select
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* Application — radio-style single selection */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">Application</p>
        <div className="flex flex-col gap-1">
          {applicationFilters.map((item, i) => (
            <button
              key={item.type}
              onClick={() => selectApplication(i)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                item.checked
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
