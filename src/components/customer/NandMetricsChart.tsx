'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NandMetricKey } from '@/lib/nand-constants';
import GenericMetricsChart from '@/components/customer-shared/GenericMetricsChart';
import type { MetricsSection } from '@/components/customer-shared/GenericMetricsChart';

const NAND_SECTIONS: MetricsSection[] = [
  { metricKey: 'aspChangeQoQ', selectKey: 'asp', title: 'NAND ASP 변동률 (QoQ)', description: '분기별 평균판매가격 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'bitShipmentGrowthQoQ', selectKey: 'bitShipment', title: 'Bit 출하량 성장률 (QoQ)', description: '분기별 비트 출하량 변동률(%)', chartType: 'bar', unit: '%' },
  { metricKey: 'qlcRatio', selectKey: 'qlc', title: 'QLC 비중 추이', description: 'NAND 출하 대비 QLC 비중(%)', chartType: 'area', unit: '%' },
  { metricKey: 'utilizationRate', selectKey: 'utilization', title: '가동률 추이', description: '생산설비 가동률(%)', chartType: 'line', unit: '%', yDomain: [50, 100] },
  { metricKey: 'inventoryDays', selectKey: 'inventory', title: '재고일수 추이', description: '평균 재고 보유일수', chartType: 'line', unit: '일' },
];

interface NandMetricsChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  onSelectMetric?: (key: NandMetricKey) => void;
}

export default function NandMetricsChart({ customers, onSelectMetric }: NandMetricsChartProps) {
  const transformed = Object.fromEntries(
    NAND_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].nandMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericMetricsChart
      customerIds={NAND_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={NAND_CUSTOMERS}
      sections={NAND_SECTIONS}
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
    />
  );
}
