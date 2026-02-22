'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FoundryMetricKey } from '@/lib/foundry-constants';
import GenericStackedMixChart from '@/components/customer-shared/GenericStackedMixChart';

interface FoundryProcessNodeChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  onSelectMetric?: (key: FoundryMetricKey) => void;
}

export default function FoundryProcessNodeChart({ customers, onSelectMetric }: FoundryProcessNodeChartProps) {
  const transformed = Object.fromEntries(
    FOUNDRY_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].foundryMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericStackedMixChart
      title="공정 노드 믹스"
      footnote="매출 기준 공정 노드별 비중(%)"
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={FOUNDRY_CUSTOMERS}
      nestedField="processNode"
      categories={[
        { key: 'legacy', label: '레거시(10nm+)', color: '#94A3B8' },
        { key: 'node7nm', label: '7nm', color: '#3B82F6' },
        { key: 'node5nm', label: '5nm', color: '#8B5CF6' },
        { key: 'node3nm', label: '3nm이하', color: '#EC4899' },
      ]}
      defaultCustomerId="tsmc"
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="processNode"
    />
  );
}
