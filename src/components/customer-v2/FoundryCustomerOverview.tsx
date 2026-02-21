'use client';

import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMER_IDS } from '@/lib/foundry-constants';
import FoundryCustomerCard from './FoundryCustomerCard';

interface FoundryCustomerOverviewProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  selectedCustomerId?: FoundryCustomerId | null;
  onSelectCustomer?: (id: FoundryCustomerId) => void;
}

export default function FoundryCustomerOverview({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: FoundryCustomerOverviewProps) {
  return (
    <section className="mb-10">
      <h2 className="mb-5 text-lg font-semibold text-slate-800">고객사 현황</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FOUNDRY_CUSTOMER_IDS.map((id) => (
          <FoundryCustomerCard
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
