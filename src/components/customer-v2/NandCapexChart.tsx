'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NandMetricKey } from '@/lib/nand-constants';
import GenericCapexChart from '@/components/customer-shared/GenericCapexChart';

interface NandCapexChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  onSelectMetric?: (key: NandMetricKey) => void;
}

export default function NandCapexChart({ customers, onSelectMetric }: NandCapexChartProps) {
  const transformed = Object.fromEntries(
    NAND_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].nandMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericCapexChart
      customerIds={NAND_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={NAND_CUSTOMERS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="capex"
    />
  );
}
