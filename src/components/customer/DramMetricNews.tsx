'use client';
import { DramMetricKey, DRAM_METRIC_NEWS_QUERIES } from '@/lib/customer-constants';
import { useDramMetricNews } from '@/hooks/useDramMetricNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface DramMetricNewsProps {
  metricKey: DramMetricKey;
  onClose: () => void;
}

export default function DramMetricNews({ metricKey, onClose }: DramMetricNewsProps) {
  const metric = DRAM_METRIC_NEWS_QUERIES[metricKey];
  const { articles, answer, loading, error } = useDramMetricNews(metricKey);
  return <GenericNewsPanel title={metric.labelKo} color={metric.color} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
