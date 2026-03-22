'use client';
import { useState, useEffect } from 'react';
import type { CustomerExecutive, CustomerDetailId } from '@/types/indicators';

interface CustomerDetailData {
  customerList: { id: CustomerDetailId; label: string; type: 'memory' | 'foundry' | 'aggregate'; subLabel?: string }[];
  customers: Record<CustomerDetailId, CustomerExecutive>;
}

export function useCustomerDetailData() {
  const [data, setData] = useState<CustomerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customer-detail')
      .then(res => res.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
