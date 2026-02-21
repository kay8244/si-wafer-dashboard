'use client';

import { useState, useMemo } from 'react';
import type { ApplicationFilterItem, ApplicationType } from '@/types/v2';
import { VCM_DATA } from '@/data/v2/vcm-mock';
import { useV2News } from '@/hooks/useV2News';
import VcmFilterPanel from './VcmFilterPanel';
import DemandBarChart from './DemandBarChart';
import VcmNewsPanel from './VcmNewsPanel';
import DeviceStackedChart from './DeviceStackedChart';
import MountTable from './MountTable';

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

export default function VcmPage() {
  const [version, setVersion] = useState(VCM_DATA.versions[0].id);
  const [applicationFilters, setApplicationFilters] = useState<ApplicationFilterItem[]>(INITIAL_APP_FILTERS);

  // Selected application (single selection)
  const primaryApp = useMemo<ApplicationType>(() => {
    const checked = applicationFilters.find((f) => f.checked);
    return checked ? checked.type : 'traditionalServer';
  }, [applicationFilters]);

  const primaryAppLabel = useMemo<string>(() => {
    const checked = applicationFilters.find((f) => f.checked);
    return checked ? checked.label : 'Traditional Server';
  }, [applicationFilters]);

  // News queries for primary app
  const newsQuery = useMemo(() => {
    const q = VCM_DATA.newsQueries[primaryApp];
    return { queryKo: q.queryKo, queryEn: q.queryEn };
  }, [primaryApp]);

  const { articles, answer, loading: newsLoading } = useV2News(newsQuery.queryKo, newsQuery.queryEn);

  // Quarterly application demand chart data
  const appChartData = useMemo(() => {
    return VCM_DATA.applicationQuarterlyDemands[primaryApp] ?? [];
  }, [primaryApp]);

  // Device stacked data for selected application
  const deviceStackedData = useMemo(() => {
    return VCM_DATA.deviceStackedByApp[primaryApp] ?? [];
  }, [primaryApp]);

  // Mount and wafer data based on primary app
  const mountPerUnit = useMemo(() => {
    return VCM_DATA.mountPerUnitByApp[primaryApp];
  }, [primaryApp]);

  const totalWaferDemand = useMemo(() => {
    return VCM_DATA.totalWaferDemandByApp[primaryApp];
  }, [primaryApp]);

  return (
    <div className="flex h-full min-h-0" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Left Filter Panel */}
      <VcmFilterPanel
        version={version}
        setVersion={setVersion}
        versions={VCM_DATA.versions}
        applicationFilters={applicationFilters}
        setApplicationFilters={setApplicationFilters}
      />

      {/* Right Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Page title */}
        <h2 className="text-lg font-bold text-gray-900">VCM 현황판</h2>

        {/* Top Row: Application demand chart + News */}
        <div className="flex gap-4" style={{ height: 320 }}>
          <div className="flex-[3]">
            <DemandBarChart
              title={`${primaryAppLabel} 수요`}
              data={appChartData}
              barColor={APP_COLORS[primaryApp]}
            />
          </div>
          <div className="flex-[2]">
            <VcmNewsPanel
              articles={articles}
              answer={answer}
              loading={newsLoading}
              accentColor={APP_COLORS[primaryApp]}
            />
          </div>
        </div>

        {/* Bottom Row: Device stacked chart + Mount/Total Wafer tables */}
        <div className="flex gap-4" style={{ minHeight: 300 }}>
          <div className="flex-[3]">
            <DeviceStackedChart
              title={`${primaryAppLabel} — Device별 Wafer 수요 (Kwsm)`}
              data={deviceStackedData}
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
