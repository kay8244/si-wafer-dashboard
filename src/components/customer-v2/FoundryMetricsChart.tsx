'use client';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FoundryMetricKey } from '@/lib/foundry-constants';
import GenericMetricsChart from '@/components/customer-shared/GenericMetricsChart';
import type { MetricsSection } from '@/components/customer-shared/GenericMetricsChart';

const FOUNDRY_SECTIONS: MetricsSection[] = [
  { metricKey: 'waferAspChangeQoQ', selectKey: 'waferAsp', title: '웨이퍼 ASP 변동률 (QoQ)', description: '분기별 웨이퍼 평균판매가격 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'waferShipmentGrowthQoQ', selectKey: 'waferShipment', title: '웨이퍼 출하량 성장률 (QoQ)', description: '분기별 웨이퍼 출하량 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'advancedNodeRatio', selectKey: 'advancedNode', title: '첨단 노드 비중 추이', description: '매출 대비 첨단 공정(7nm 이하) 비중(%)', chartType: 'area', unit: '%' },
  { metricKey: 'utilizationRate', selectKey: 'utilization', title: '가동률 추이', description: '생산설비 가동률(%)', chartType: 'line', unit: '%', yDomain: [50, 100] },
  { metricKey: 'inventoryDays', selectKey: 'inventory', title: '재고일수 추이', description: '평균 재고 보유일수', chartType: 'line', unit: '일' },
];

interface FoundryMetricsChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  onSelectMetric?: (key: FoundryMetricKey) => void;
}

export default function FoundryMetricsChart({ customers, onSelectMetric }: FoundryMetricsChartProps) {
  const transformed = Object.fromEntries(
    FOUNDRY_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].foundryMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericMetricsChart
      customerIds={FOUNDRY_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={FOUNDRY_CUSTOMERS}
      sections={FOUNDRY_SECTIONS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
    />
  );
}
