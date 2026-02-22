'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS } from '@/lib/nand-constants';
import GenericQuarterlyTable from '@/components/customer-shared/GenericQuarterlyTable';

interface NandQuarterlyTableProps {
  customers: Record<NandCustomerId, NandCustomerData>;
}

export default function NandQuarterlyTable({ customers }: NandQuarterlyTableProps) {
  return (
    <GenericQuarterlyTable
      customerIds={NAND_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={NAND_CUSTOMERS}
    />
  );
}
