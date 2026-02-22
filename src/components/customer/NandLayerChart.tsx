'use client';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NandMetricKey } from '@/lib/nand-constants';
import GenericStackedMixChart from '@/components/customer-shared/GenericStackedMixChart';

interface NandLayerChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  onSelectMetric?: (key: NandMetricKey) => void;
}

export default function NandLayerChart({ customers, onSelectMetric }: NandLayerChartProps) {
  const transformed = Object.fromEntries(
    NAND_CUSTOMER_IDS.map((id) => [id, { metrics: customers[id].nandMetrics }])
  ) as unknown as Record<string, { metrics: Record<string, unknown>[] }>;
  return (
    <GenericStackedMixChart
      title="적층 기술 믹스"
      footnote="생산 비트 기준 적층 단수별 비중(%)"
      customerIds={NAND_CUSTOMER_IDS}
      customers={transformed}
      customerInfo={NAND_CUSTOMERS}
      nestedField="layerStack"
      categories={[
        { key: 'legacy', label: '레거시', color: '#94A3B8' },
        { key: 'layer128', label: '128단', color: '#3B82F6' },
        { key: 'layer176', label: '176단', color: '#8B5CF6' },
        { key: 'layer232', label: '232단+', color: '#EC4899' },
      ]}
      defaultCustomerId="samsungNand"
      onSelectMetric={onSelectMetric as ((key: string) => void) | undefined}
      selectKey="layerStack"
    />
  );
}
