'use client';

import { useState, useRef, useEffect } from 'react';
import type { CustomerExecutive, CustomerMetricId } from '@/types/v2';

interface Props {
  data: CustomerExecutive;
}

const DEFAULT_KPIS: CustomerMetricId[] = ['productMix', 'inventoryLevel', 'utilization'];

export default function ExecutivePanel({ data }: Props) {
  const [selectedKpis, setSelectedKpis] = useState<CustomerMetricId[]>(DEFAULT_KPIS);
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

  const allKpis = data.configurableKpis;
  const displayedKpis = allKpis.filter((k) => selectedKpis.includes(k.id));
  const availableToAdd = allKpis.filter((k) => !selectedKpis.includes(k.id));

  const addKpi = (id: CustomerMetricId) => {
    setSelectedKpis((prev) => [...prev, id]);
    setDropdownOpen(false);
  };

  const removeKpi = (id: CustomerMetricId) => {
    if (selectedKpis.length <= 1) return;
    setSelectedKpis((prev) => prev.filter((k) => k !== id));
  };

  const trendIcon = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <span className="text-green-500">&#9650;</span>;
    if (trend === 'down') return <span className="text-red-500">&#9660;</span>;
    return <span className="text-gray-400">&#9654;</span>;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Executive 현황판 card */}
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

        {/* Product Mix horizontal bars */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Product Mix (%)</p>
          <div className="flex items-center gap-3">
            {data.productMix.map((item) => (
              <div key={item.category} className="flex-1 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {item.percentage}%
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-600">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {displayedKpis.map((kpi) => (
            <div
              key={kpi.id}
              className="group relative rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-600 dark:bg-gray-700/50"
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
              <div className="text-center">
                <div className="text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">
                  {kpi.value}
                  <span className="ml-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">{kpi.unit}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-center gap-1 text-xs">
                  {trendIcon(kpi.trend)}
                  <span className={
                    kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                    kpi.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500 dark:text-gray-400'
                  }>
                    {kpi.trendValue}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
