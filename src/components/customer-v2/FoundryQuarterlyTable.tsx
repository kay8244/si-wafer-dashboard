'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS } from '@/lib/foundry-constants';
import GenericQuarterlyTable from '@/components/customer-shared/GenericQuarterlyTable';

interface FoundryQuarterlyTableProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
}

export default function FoundryQuarterlyTable({ customers }: FoundryQuarterlyTableProps) {
  return (
    <GenericQuarterlyTable
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={FOUNDRY_CUSTOMERS}
    />
  );
}
