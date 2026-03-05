'use client';

import type { CustomerDetailId } from '@/types/indicators';
import { CUSTOMER_LIST } from '@/data/customer-detail-mock';

interface Props {
  selectedCustomer: CustomerDetailId;
  onSelect: (id: CustomerDetailId) => void;
}

const memoryCustomers = CUSTOMER_LIST.filter(
  (c) => c.type === 'aggregate' || c.type === 'memory',
);
const foundryCustomers = CUSTOMER_LIST.filter((c) => c.type === 'foundry');

export default function CustomerSidebar({ selectedCustomer, onSelect }: Props) {
  function renderButton(customer: (typeof CUSTOMER_LIST)[number]) {
    const isSelected = selectedCustomer === customer.id;
    return (
      <button
        key={customer.id}
        onClick={() => onSelect(customer.id)}
        className={`ml-2 flex flex-col items-start rounded-lg px-3 py-2 text-left transition-all ${
          isSelected
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        <span className="text-sm font-semibold leading-tight">
          {customer.label}
        </span>
        {customer.subLabel && (
          <span
            className={`text-[10px] leading-tight ${
              isSelected ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {customer.subLabel}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">대상 고객</p>

      {/* 메모리 section */}
      <p className="mt-1 px-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
        메모리 (Prime/PW)
      </p>
      <div className="mb-1 flex flex-col gap-0.5">
        {memoryCustomers.map(renderButton)}
      </div>

      {/* 파운드리 section */}
      <p className="mt-2 px-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
        파운드리 (EPI)
      </p>
      <div className="flex flex-col gap-0.5">
        {foundryCustomers.map(renderButton)}
      </div>
    </div>
  );
}
