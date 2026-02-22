'use client';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';
import GenericMetricsChart from '@/components/customer-shared/GenericMetricsChart';
import type { MetricsSection } from '@/components/customer-shared/GenericMetricsChart';

const DRAM_SECTIONS: MetricsSection[] = [
  { metricKey: 'aspChangeQoQ', selectKey: 'asp', title: 'DRAM ASP 변동률 (QoQ)', description: '분기별 평균판매가격 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'bitShipmentGrowthQoQ', selectKey: 'bitShipment', title: 'Bit 출하량 성장률 (QoQ)', description: '분기별 비트 출하량 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'hbmRatio', selectKey: 'hbm', title: 'HBM 매출 비중 추이', description: 'DRAM 매출 대비 HBM 매출 비중(%)', chartType: 'area', unit: '%' },
  { metricKey: 'utilizationRate', selectKey: 'utilization', title: '가동률 추이', description: '생산설비 가동률(%)', chartType: 'line', unit: '%', yDomain: [50, 100] },
  { metricKey: 'inventoryDays', selectKey: 'inventory', title: '재고일수 추이', description: '평균 재고 보유일수', chartType: 'line', unit: '일' },
];

interface DramMetricsChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

export default function DramMetricsChart({ customers, onSelectMetric }: DramMetricsChartProps) {
  const transformed = Object.fromEntries(
    DRAM_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].dramMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericMetricsChart
      customerIds={DRAM_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={DRAM_CUSTOMERS}
      sections={DRAM_SECTIONS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
    />
  );
}
