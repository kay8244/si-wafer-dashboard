'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NAND_FINANCIAL_METRICS } from '@/lib/nand-constants';
import GenericTrendChart from '@/components/customer-shared/GenericTrendChart';

interface NandTrendChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
}

export default function NandTrendChart({ customers }: NandTrendChartProps) {
  return (
    <GenericTrendChart
      customerIds={NAND_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={NAND_CUSTOMERS}
      financialMetrics={NAND_FINANCIAL_METRICS}
    />
  );
}
