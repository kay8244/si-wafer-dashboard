'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { CustomerExecutive, MonthlyMetricData } from '@/types/indicators';

type KpiId = 'inventoryMonths' | 'utilization' | 'capa' | 'waferInput' | 'purchaseVolume';

interface KpiCard {
  id: KpiId;
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
}

const DEFAULT_KPIS: KpiId[] = ['inventoryMonths', 'utilization', 'capa'];

const KPI_META: Record<KpiId, { label: string; unit: string; decimals: number }> = {
  inventoryMonths: { label: '재고수준', unit: '개월', decimals: 1 },
  utilization: { label: '가동률', unit: '%', decimals: 1 },
  capa: { label: 'Capa', unit: 'K/M', decimals: 1 },
  waferInput: { label: '투입량', unit: 'K/M', decimals: 1 },
  purchaseVolume: { label: '구매량', unit: 'K/M', decimals: 1 },
};

const ALL_KPI_IDS: KpiId[] = ['inventoryMonths', 'utilization', 'capa', 'waferInput', 'purchaseVolume'];

interface Props {
  data: CustomerExecutive;
}

function getVal(d: MonthlyMetricData, key: KpiId): number {
  if (key === 'utilization') {
    return d.capa > 0 ? +((d.waferInput / d.capa) * 100).toFixed(1) : d.utilization;
  }
  return d[key] as number;
}

export default function ExecutivePanel({ data }: Props) {
  const [selectedKpis, setSelectedKpis] = useState<KpiId[]>(DEFAULT_KPIS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Derive KPI values from latest monthlyMetrics (matches Wafer chart data)
  const kpiCards = useMemo((): KpiCard[] => {
    const metrics = data.monthlyMetrics;
    if (metrics.length < 2) return [];
    const latest = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];

    return ALL_KPI_IDS.map((id): KpiCard => {
      const meta = KPI_META[id];
      const currentVal = getVal(latest, id);
      const prevVal = getVal(prev, id);
      const change = prevVal !== 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
      const trend: 'up' | 'down' | 'flat' = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';

      return {
        id,
        label: meta.label,
        value: currentVal.toFixed(meta.decimals),
        unit: meta.unit,
        trend,
        trendValue: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      };
    });
  }, [data.monthlyMetrics]);

  const displayedKpis = kpiCards.filter((k) => selectedKpis.includes(k.id));
  const availableToAdd = kpiCards.filter((k) => !selectedKpis.includes(k.id));

  const addKpi = (id: KpiId) => {
    setSelectedKpis((prev) => [...prev, id]);
    setDropdownOpen(false);
  };

  const removeKpi = (id: KpiId) => {
    if (selectedKpis.length <= 1) return;
    setSelectedKpis((prev) => prev.filter((k) => k !== id));
  };

  const trendIcon = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <span className="text-blue-500">&#9650;</span>;
    if (trend === 'down') return <span className="text-red-500">&#9660;</span>;
    return <span className="text-gray-400">&#9654;</span>;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Executive 현황판</h3>
        {availableToAdd.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              title="지표 추가"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                {availableToAdd.map((kpi) => (
                  <button
                    key={kpi.id}
                    onClick={() => addKpi(kpi.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-blue-500">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {kpi.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>


      {/* KPI Cards — Title → Number → MoM */}
      <div className="grid grid-cols-3 gap-2">
        {displayedKpis.map((kpi) => (
          <div
            key={kpi.id}
            className="group relative rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-600 dark:bg-gray-700/50"
          >
            {selectedKpis.length > 1 && (
              <button
                onClick={() => removeKpi(kpi.id)}
                className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 group-hover:flex dark:hover:bg-gray-600 dark:hover:text-gray-300"
                title="제거"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{kpi.label}</div>
            <div className="mt-1 text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {kpi.value}
              <span className="ml-0.5 text-xs font-normal text-gray-400 dark:text-gray-500">{kpi.unit}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="text-gray-400 dark:text-gray-500">전월대비</span>
              {trendIcon(kpi.trend)}
              <span
                className={
                  kpi.trend === 'up'
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : kpi.trend === 'down'
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                }
              >
                {kpi.trendValue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
