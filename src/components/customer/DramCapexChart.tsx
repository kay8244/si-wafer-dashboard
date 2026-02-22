'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';
import GenericCapexChart from '@/components/customer-shared/GenericCapexChart';

interface DramCapexChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

export default function DramCapexChart({ customers, onSelectMetric }: DramCapexChartProps) {
  const transformed = Object.fromEntries(
    DRAM_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].dramMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericCapexChart
      customerIds={DRAM_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={DRAM_CUSTOMERS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="capex"
    />
  );
}
