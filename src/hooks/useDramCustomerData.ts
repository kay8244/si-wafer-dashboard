'use client';

import { useState, useEffect, useCallback } from 'react';
import { DramDashboardData } from '@/types/customer';
import { APIResponse } from '@/types/dashboard';

interface UseDramCustomerDataReturn {
  data: DramDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDramCustomerData(): UseDramCustomerDataReturn {
  const [data, setData] = useState<DramDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? '/api/dram-customers?refresh=true' : '/api/dram-customers';
      const response = await fetch(url);
      const result: APIResponse<DramDashboardData> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'DRAM 고객 데이터를 불러오는데 실패했습니다.');
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
