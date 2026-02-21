'use client';

import { useState, useEffect, useCallback } from 'react';
import { NandDashboardData } from '@/types/nand-customer';
import { APIResponse } from '@/types/dashboard';

interface UseNandCustomerDataReturn {
  data: NandDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNandCustomerData(): UseNandCustomerDataReturn {
  const [data, setData] = useState<NandDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? '/api/nand-customers?refresh=true' : '/api/nand-customers';
      const response = await fetch(url);
      const result: APIResponse<NandDashboardData> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'NAND 고객 데이터를 불러오는데 실패했습니다.');
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
