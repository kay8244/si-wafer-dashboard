'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FoundryMetricKey } from '@/lib/foundry-constants';
import GenericCapexChart from '@/components/customer-shared/GenericCapexChart';

interface FoundryCapexChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  onSelectMetric?: (key: FoundryMetricKey) => void;
}

export default function FoundryCapexChart({ customers, onSelectMetric }: FoundryCapexChartProps) {
  const transformed = Object.fromEntries(
    FOUNDRY_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].foundryMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericCapexChart
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={FOUNDRY_CUSTOMERS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="capex"
    />
  );
}
