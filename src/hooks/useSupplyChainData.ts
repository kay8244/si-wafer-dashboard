'use client';
import { useState, useEffect } from 'react';
import type { SupplyChainCategory, InternalCompanyData, FoundryNode } from '@/types/indicators';

export interface ServerIndicatorData {
  id: string;
  group: string;
  subGroup: string;
  company: string;
  data: { month: string; value: number }[];
}

export interface MemoryPriceIndicatorData {
  id: string;
  name: string;
  unit: string;
  data: { month: string; value: number }[];
}

interface SupplyChainData {
  categories: SupplyChainCategory[];
  internalCompanyData: Record<string, InternalCompanyData>;
  overlayColors: Record<string, string>;
  months: string[];
  tableMonths: string[];
  foundryNodes: Record<string, FoundryNode[]>;
  foundryNodeColors: Record<string, string>;
  serverIndicators: ServerIndicatorData[];
  memoryPriceIndicators: MemoryPriceIndicatorData[];
}

export function useSupplyChainData() {
  const [data, setData] = useState<SupplyChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/supply-chain')
      .then(res => res.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
