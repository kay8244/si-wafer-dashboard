'use client';

import { useState, useEffect } from 'react';
import { FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS } from '@/lib/foundry-constants';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

export function useFoundryCustomerNews(customerId: FoundryCustomerId | null) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setArticles([]);
      setAnswer(null);
      setError(null);
      return;
    }

    const customer = FOUNDRY_CUSTOMERS[customerId];
    const controller = new AbortController();

    async function fetchNews() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          queryKo: customer.newsQueryKo,
          queryEn: customer.newsQueryEn,
          companyName: customer.nameKo,
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
  }, [customerId]);

  return { articles, answer, loading, error };
}
