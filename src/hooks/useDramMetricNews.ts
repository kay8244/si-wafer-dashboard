'use client';

import { useState, useEffect } from 'react';
import { DramMetricKey, DRAM_METRIC_NEWS_QUERIES } from '@/lib/customer-constants';
import { NewsArticle } from '@/hooks/useDramCustomerNews';

export function useDramMetricNews(metricKey: DramMetricKey | null) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metricKey) {
      setArticles([]);
      setAnswer(null);
      setError(null);
      return;
    }

    const metric = DRAM_METRIC_NEWS_QUERIES[metricKey];
    const controller = new AbortController();

    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          queryKo: metric.queryKo,
          queryEn: metric.queryEn,
          companyName: metric.labelKo,
        });
        const res = await fetch(`/api/news?${params}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? 'Unknown error');
        setAnswer(json.answer ?? null);
        setArticles(json.articles);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to fetch news');
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
    return () => controller.abort();
  }, [metricKey]);

  return { articles, answer, loading, error };
}
