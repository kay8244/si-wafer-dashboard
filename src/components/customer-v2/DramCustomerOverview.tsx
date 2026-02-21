'use client';

import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMER_IDS } from '@/lib/customer-constants';
import DramCustomerCard from './DramCustomerCard';

interface DramCustomerOverviewProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  selectedCustomerId?: DramCustomerId | null;
  onSelectCustomer?: (id: DramCustomerId) => void;
}

export default function DramCustomerOverview({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: DramCustomerOverviewProps) {
  return (
    <section className="mb-10">
      <h2 className="mb-5 text-lg font-semibold text-slate-800">고객사 현황</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DRAM_CUSTOMER_IDS.map((id) => (
          <DramCustomerCard
            key={id}
            data={customers[id]}
            selected={selectedCustomerId === id}
            onSelect={() => onSelectCustomer?.(id)}
          />
        ))}
      </div>
    </section>
  );
}
