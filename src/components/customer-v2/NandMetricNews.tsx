'use client';
import { NandMetricKey, NAND_METRIC_NEWS_QUERIES } from '@/lib/nand-constants';
import { useNandMetricNews } from '@/hooks/useNandMetricNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface NandMetricNewsProps {
  metricKey: NandMetricKey;
  onClose: () => void;
}

export default function NandMetricNews({ metricKey, onClose }: NandMetricNewsProps) {
  const metric = NAND_METRIC_NEWS_QUERIES[metricKey];
  const { articles, answer, loading, error } = useNandMetricNews(metricKey);
  return <GenericNewsPanel title={metric.labelKo} color={metric.color} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
