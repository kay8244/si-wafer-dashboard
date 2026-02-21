'use client';

import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMER_IDS } from '@/lib/nand-constants';
import NandCustomerCard from './NandCustomerCard';

interface NandCustomerOverviewProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  selectedCustomerId?: NandCustomerId | null;
  onSelectCustomer?: (id: NandCustomerId) => void;
}

export default function NandCustomerOverview({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: NandCustomerOverviewProps) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">고객사 현황</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {NAND_CUSTOMER_IDS.map((id) => (
          <NandCustomerCard
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
