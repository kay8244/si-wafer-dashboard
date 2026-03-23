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
  deviceStackedYearly: DeviceStackedYearlyEntry[];
  appYearlyDemands: Record<ApplicationType, YearlyValue[]>;
  deviceStackedYearlyByApp: Record<ApplicationType, DeviceStackedYearlyEntry[]>;
}

export type { VcmApiData, YearlyMountItem };

export function useVcmData() {
  const [data, setData] = useState<VcmApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vcm')
      .then(res => res.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
