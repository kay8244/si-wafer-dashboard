'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FOUNDRY_FINANCIAL_METRICS } from '@/lib/foundry-constants';
import GenericTrendChart from '@/components/customer-shared/GenericTrendChart';

interface FoundryTrendChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
}

export default function FoundryTrendChart({ customers }: FoundryTrendChartProps) {
  return (
    <GenericTrendChart
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={customers as unknown as Record<string, { segmentFinancials: Record<string, unknown>[] }>}
      customerInfo={FOUNDRY_CUSTOMERS}
      financialMetrics={FOUNDRY_FINANCIAL_METRICS}
    />
  );
}
