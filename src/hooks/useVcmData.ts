'use client';
import { useState, useEffect } from 'react';
import type { VcmData, AppCategoryType, ApplicationType, MountPerUnit, TotalWaferYearlyEntry, DeviceStackedYearlyEntry, YearlyValue } from '@/types/indicators';

interface YearlyMountItem {
  serverType: 'traditional' | 'ai';
  label: string;
  metrics: { year: number; value: number; unit: string }[];
}

interface VcmApiData extends VcmData {
  newsQueriesByCategory: Record<AppCategoryType, { queryKo: string; queryEn: string }>;
  mountPerUnitByCategory: Record<AppCategoryType, MountPerUnit[]>;
  yearlyMountPerUnitByCategory: Record<AppCategoryType, YearlyMountItem[]>;
  totalWaferYearly: TotalWaferYearlyEntry[];
  totalWaferYearlyInternal: TotalWaferYearlyEntry[];
  deviceStackedYearly: DeviceStackedYearlyEntry[];
  appYearlyDemands: Record<ApplicationType, YearlyValue[]>;
  deviceStackedYearlyByApp: Record<ApplicationType, DeviceStackedYearlyEntry[]>;
}

export type { VcmApiData, YearlyMountItem };

export function useVcmData(version?: string) {
  const [data, setData] = useState<VcmApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = `/api/vcm${version ? `?version=${version}` : ''}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [version]);

  return { data, loading, error };
}
