'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardData, APIResponse } from '@/types/dashboard';

interface UseFinancialDataReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFinancialData(): UseFinancialDataReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? '/api/financials?refresh=true' : '/api/financials';
      const response = await fetch(url);
      const result: APIResponse<DashboardData> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return { data, loading, error, refresh };
}
