'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';
import GenericStackedMixChart from '@/components/customer-shared/GenericStackedMixChart';

interface DramTechNodeChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

export default function DramTechNodeChart({ customers, onSelectMetric }: DramTechNodeChartProps) {
  const transformed = Object.fromEntries(
    DRAM_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].dramMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericStackedMixChart
      title="기술노드 믹스"
      footnote="생산 비트 기준 기술노드별 비중(%)"
      customerIds={DRAM_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={DRAM_CUSTOMERS}
      nestedField="techNode"
      categories={[
        { key: 'legacy', label: 'Legacy', color: '#9CA3AF' },
        { key: 'node1a', label: '1anm', color: '#F59E0B' },
        { key: 'node1b', label: '1bnm', color: '#3B82F6' },
        { key: 'node1g', label: '1gnm', color: '#10B981' },
      ]}
      defaultCustomerId="samsungDS"
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="techNode"
    />
  );
}
