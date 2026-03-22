'use client';
import { useState, useEffect } from 'react';
import type { VcmData, AppCategoryType, MountPerUnit } from '@/types/indicators';

interface VcmApiData extends VcmData {
  newsQueriesByCategory: Record<AppCategoryType, { queryKo: string; queryEn: string }>;
  mountPerUnitByCategory: Record<AppCategoryType, MountPerUnit[]>;
}

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
