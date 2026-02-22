'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS } from '@/lib/customer-constants';
import GenericQuarterlyTable from '@/components/customer-shared/GenericQuarterlyTable';

interface DramQuarterlyTableProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

export default function DramQuarterlyTable({ customers }: DramQuarterlyTableProps) {
  return (
    <GenericQuarterlyTable
      customerIds={DRAM_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={DRAM_CUSTOMERS}
    />
  );
}
