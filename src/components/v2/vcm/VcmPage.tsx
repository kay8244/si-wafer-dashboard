'use client';

import { useState, useMemo } from 'react';
import type { ApplicationFilterItem, DeviceFilterItem, ApplicationType, DeviceType } from '@/types/v2';
import { VCM_DATA } from '@/data/v2/vcm-mock';
import { useV2News } from '@/hooks/useV2News';
import VcmFilterPanel from './VcmFilterPanel';
import DemandBarChart from './DemandBarChart';
import VcmNewsPanel from './VcmNewsPanel';
import DemandTable from './DemandTable';
import MountTable from './MountTable';

type DeviceTab = 'dram' | 'hbm' | 'nand';

const APP_COLORS: Record<ApplicationType, string> = {
  traditionalServer: '#3b82f6',
  aiServer: '#8b5cf6',
  smartphone: '#10b981',
  pcNotebook: '#f59e0b',
  electricVehicle: '#ef4444',
  ioe: '#06b6d4',
  automotive: '#f97316',
};

const INITIAL_APP_FILTERS: ApplicationFilterItem[] = [
  { type: 'traditionalServer', label: 'Traditional Server', checked: true },
  { type: 'aiServer', label: 'AI/Highpower Server', checked: false },
  { type: 'smartphone', label: 'Smartphone', checked: false },
  { type: 'pcNotebook', label: 'PC/Notebook', checked: false },
  { type: 'electricVehicle', label: 'Electric Vehicle', checked: false },
  { type: 'ioe', label: 'IoE', checked: false },
  { type: 'automotive', label: 'Automotive', checked: false },
];

const INITIAL_DEVICE_FILTERS: DeviceFilterItem[] = [
  { type: 'dram', label: 'DRAM', checked: true },
  { type: 'hbm', label: 'HBM', checked: false },
  { type: 'nand', label: 'NAND', checked: false },
  { type: 'foundry', label: 'Foundry', checked: false },
  { type: 'discrete', label: 'Discrete', checked: false },
];

const DEVICE_TAB_COLORS: Record<DeviceTab, string> = {
  dram: '#3b82f6',
  hbm: '#8b5cf6',
  nand: '#10b981',
};

export default function VcmPage() {
  const [version, setVersion] = useState(VCM_DATA.versions[0].id);
  const [applicationFilters, setApplicationFilters] = useState<ApplicationFilterItem[]>(INITIAL_APP_FILTERS);
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilterItem[]>(INITIAL_DEVICE_FILTERS);
  const [deviceTab, setDeviceTab] = useState<DeviceTab>('dram');

  // Determine primary selected application (first checked)
  const primaryApp = useMemo<ApplicationType | null>(() => {
    const checked = applicationFilters.find((f) => f.checked);
    return checked ? checked.type : null;
  }, [applicationFilters]);

  const primaryAppLabel = useMemo<string>(() => {
    const checked = applicationFilters.find((f) => f.checked);
    return checked ? checked.label : 'Server';
  }, [applicationFilters]);

  // News queries for primary app
  const newsQuery = useMemo(() => {
    if (!primaryApp) return { queryKo: null, queryEn: null };
    const q = VCM_DATA.newsQueries[primaryApp];
    return { queryKo: q.queryKo, queryEn: q.queryEn };
  }, [primaryApp]);

  const { articles, answer, loading: newsLoading } = useV2News(newsQuery.queryKo, newsQuery.queryEn);

  // Mount and wafer data based on primary app
  const mountPerUnit = useMemo(() => {
    if (!primaryApp) return VCM_DATA.mountPerUnit;
    return VCM_DATA.mountPerUnitByApp[primaryApp];
  }, [primaryApp]);

  const totalWaferDemand = useMemo(() => {
    if (!primaryApp) return VCM_DATA.totalWaferDemand;
    return VCM_DATA.totalWaferDemandByApp[primaryApp];
  }, [primaryApp]);

  // Aggregate application demand across all checked applications by year
  const appChartData = useMemo(() => {
    const checkedTypes = applicationFilters.filter((f) => f.checked).map((f) => f.type);
    if (checkedTypes.length === 0) return [];

    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    return years.map((year) => {
      let total = 0;
      let isEstimate = false;
      for (const type of checkedTypes) {
        const demand = VCM_DATA.applicationDemands[type];
        const entry = demand.yearly.find((y) => y.year === year);
        if (entry) {
          total += entry.value;
          if (entry.isEstimate) isEstimate = true;
        }
      }
      return { year, value: total, isEstimate };
    });
  }, [applicationFilters]);

  // Device wafer demand for the selected tab
  const deviceChartData = useMemo(() => {
    const checkedDeviceTypes = deviceFilters.filter((f) => f.checked).map((f) => f.type);
    if (!checkedDeviceTypes.includes(deviceTab)) return [];

    const demand = VCM_DATA.deviceWaferDemands[deviceTab as DeviceType];
    return demand.yearly.map((y) => ({
      year: y.year,
      value: y.waferDemand,
      isEstimate: y.isEstimate,
    }));
  }, [deviceFilters, deviceTab]);

  // Filtered application table rows
  const filteredTableData = useMemo(() => {
    return VCM_DATA.applicationTable;
  }, []);

  const appChartLabel = useMemo(() => {
    const checkedLabels = applicationFilters.filter((f) => f.checked).map((f) => f.label);
    if (checkedLabels.length === INITIAL_APP_FILTERS.length) return 'Application 수요 (전체)';
    if (checkedLabels.length === 0) return 'Application 수요 (선택 없음)';
    return `Application 수요 (${checkedLabels.slice(0, 2).join(', ')}${checkedLabels.length > 2 ? ` 외 ${checkedLabels.length - 2}` : ''})`;
  }, [applicationFilters]);

  return (
    <div className="flex h-full min-h-0" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Left Filter Panel */}
      <VcmFilterPanel
        version={version}
        setVersion={setVersion}
        versions={VCM_DATA.versions}
        applicationFilters={applicationFilters}
        setApplicationFilters={setApplicationFilters}
        deviceFilters={deviceFilters}
        setDeviceFilters={setDeviceFilters}
      />

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Page title */}
        <h2 className="text-lg font-bold text-gray-900">VCM 현황판</h2>

        {/* Top Row: Application demand chart + News */}
        <div className="flex gap-4" style={{ height: 280 }}>
          <div className="flex-[3]">
            <DemandBarChart
              title={appChartLabel}
              data={appChartData}
              barColor={APP_COLORS.aiServer}
            />
          </div>
          <div className="flex-[2]">
            {primaryApp ? (
              <VcmNewsPanel
                articles={articles}
                answer={answer}
                loading={newsLoading}
              />
            ) : (
              <VcmNewsPanel news={VCM_DATA.news} />
            )}
          </div>
        </div>

        {/* Application demand table */}
        <DemandTable data={filteredTableData} />

        {/* Device/Wafer tab selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Device Wafer 수요:</span>
          {(['dram', 'hbm', 'nand'] as DeviceTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setDeviceTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                deviceTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Bottom Row: Device chart + Mount/Total Wafer tables */}
        <div className="flex gap-4" style={{ minHeight: 260 }}>
          <div className="flex-[3]">
            <DemandBarChart
              title={`${deviceTab.toUpperCase()} Wafer 수요 (Kwsm)`}
              data={deviceChartData}
              barColor={DEVICE_TAB_COLORS[deviceTab]}
            />
          </div>
          <div className="flex-[2]">
            <MountTable
              mountPerUnit={mountPerUnit}
              totalWaferDemand={totalWaferDemand}
              applicationLabel={primaryAppLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
