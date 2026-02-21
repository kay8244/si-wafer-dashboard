'use client';

import type { CustomerDetailId } from '@/types/v2';

interface Props {
  selectedCustomer: CustomerDetailId;
  onSelect: (id: CustomerDetailId) => void;
}

const MEMORY_CUSTOMERS: { id: CustomerDetailId; label: string }[] = [
  { id: 'SEC', label: 'SEC' },
  { id: 'SKHynix', label: 'SK하이닉스' },
  { id: 'Micron', label: 'Micron' },
];

const FOUNDRY_CUSTOMERS: { id: CustomerDetailId; label: string }[] = [
  { id: 'SEC_Foundry', label: 'SEC' },
  { id: 'TSMC', label: 'TSMC' },
  { id: 'SMC', label: 'SMC' },
  { id: 'GFS', label: 'GFS' },
];

export default function CustomerSelector({ selectedCustomer, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Memory group */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">메모리</span>
          <div className="flex gap-1">
            {MEMORY_CUSTOMERS.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCustomer === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Foundry group */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">파운드리</span>
          <div className="flex gap-1">
            {FOUNDRY_CUSTOMERS.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCustomer === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 예측치 badge */}
      <span className="rounded-full bg-yellow-200 px-3 py-1 text-xs font-medium text-yellow-800">
        예측치
      </span>
    </div>
  );
}
