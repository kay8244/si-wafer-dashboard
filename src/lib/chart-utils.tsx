'use client';

import { ReactNode } from 'react';
import { QuarterlyFinancial } from '@/types/company';

// ── Shared Types ──────────────────────────────────────────

export type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';
export type CurrencyMode = 'original' | 'krw';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

export interface CustomerInfo {
  nameKo: string;
  color: string;
  currency: string;
}

export interface FinancialMetricDef {
  key: string;
  labelKo: string;
}

// ── Constants ─────────────────────────────────────────────

export const KRW_MAP: Record<FinancialMetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

// ── Utility Functions ─────────────────────────────────────

export function renderSummaryWithRefs(
  text: string,
  articles: NewsArticle[],
  color: string,
): ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      const article = articles[idx];
      if (article) {
        return (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            title={article.title}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold text-white no-underline hover:opacity-80"
            style={{ backgroundColor: color }}
          >
            {match[1]}
          </a>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function calcYoYGrowth(
  financials: QuarterlyFinancial[],
  metric: FinancialMetricKey,
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  financials.forEach((q) => {
    const prevYear = financials.find(
      (pq) => pq.period === q.period && pq.calendarYear === String(Number(q.calendarYear) - 1),
    );
    if (prevYear && (prevYear[metric] as number) !== 0) {
      const growth =
        (((q[metric] as number) - (prevYear[metric] as number)) /
          Math.abs(prevYear[metric] as number)) *
        100;
      map.set(q.quarter, growth);
    } else {
      map.set(q.quarter, null);
    }
  });
  return map;
}

export function formatAxisValue(v: number, mode: CurrencyMode): string {
  if (mode === 'krw') {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
    if (abs >= 1e8) return `${(v / 1e8).toFixed(0)}억`;
    return String(v);
  }
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return String(v);
}

export function collectQuarters(
  customerIds: string[],
  getRecords: (id: string) => { quarter: string }[],
  count = 8,
): string[] {
  const set = new Set<string>();
  customerIds.forEach((id) => getRecords(id).forEach((r) => set.add(r.quarter)));
  return Array.from(set).sort().slice(-count);
}
