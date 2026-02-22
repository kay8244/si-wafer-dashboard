'use client';
import { FoundryMetricKey, FOUNDRY_METRIC_NEWS_QUERIES } from '@/lib/foundry-constants';
import { useFoundryMetricNews } from '@/hooks/useFoundryMetricNews';
import GenericNewsPanel from '@/components/customer-shared/GenericNewsPanel';

interface FoundryMetricNewsProps {
  metricKey: FoundryMetricKey;
  onClose: () => void;
}

export default function FoundryMetricNews({ metricKey, onClose }: FoundryMetricNewsProps) {
  const metric = FOUNDRY_METRIC_NEWS_QUERIES[metricKey];
  const { articles, answer, loading, error } = useFoundryMetricNews(metricKey);
  return <GenericNewsPanel title={metric.labelKo} color={metric.color} articles={articles} answer={answer} loading={loading} error={error} onClose={onClose} />;
}
