'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import GenericTrendChart from '@/components/customer-shared/GenericTrendChart';

interface DramTrendChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

export default function DramTrendChart({ customers }: DramTrendChartProps) {
  return (
    <GenericTrendChart
      customerIds={DRAM_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={DRAM_CUSTOMERS}
      financialMetrics={DRAM_FINANCIAL_METRICS}
    />
  );
}
