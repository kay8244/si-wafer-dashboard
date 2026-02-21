'use client';

import type { VcmVersion, ApplicationFilterItem, DeviceFilterItem } from '@/types/v2';

interface VcmFilterPanelProps {
  version: string;
  setVersion: (v: string) => void;
  versions: VcmVersion[];
  applicationFilters: ApplicationFilterItem[];
  setApplicationFilters: (filters: ApplicationFilterItem[]) => void;
  deviceFilters: DeviceFilterItem[];
  setDeviceFilters: (filters: DeviceFilterItem[]) => void;
}

export default function VcmFilterPanel({
  version,
  setVersion,
  versions,
  applicationFilters,
  setApplicationFilters,
  deviceFilters,
  setDeviceFilters,
}: VcmFilterPanelProps) {
  function toggleApplication(index: number) {
    const updated = applicationFilters.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    setApplicationFilters(updated);
  }

  function toggleDevice(index: number) {
    const updated = deviceFilters.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    );
    setDeviceFilters(updated);
  }

  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col gap-5 overflow-y-auto">
      {/* VCM Version */}
      <div>
        <label className="block font-semibold text-sm text-gray-700 mb-1">VCM Version</label>
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

      {/* Application */}
      <div>
        <p className="font-semibold text-sm text-gray-700 mb-2">Application</p>
        <div className="flex flex-col gap-1.5">
          {applicationFilters.map((item, i) => (
            <label key={item.type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleApplication(i)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div>
        <p className="font-semibold text-sm text-gray-700 mb-2">Devices</p>
        <div className="flex flex-col gap-1.5">
          {deviceFilters.map((item, i) => (
            <label key={item.type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleDevice(i)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              />
              <span className="text-sm text-gray-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
