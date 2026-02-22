'use client';

import { ReactNode } from 'react';
import type { NewsCategory } from '@/types/v2';

interface Article {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
  categories?: NewsCategory[];
}

interface CustomerNewsPanelProps {
  articles: Article[];
  answer?: string | null;
  loading?: boolean;
  error?: string | null;
  accentColor?: string;
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  'Product Mix': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  '투입량': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  '재고수준': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  '가동률': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  '투입/구매량': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const CATEGORY_BORDER: Record<NewsCategory, string> = {
  'Product Mix': 'border-l-blue-400',
  '투입량': 'border-l-emerald-400',
  '재고수준': 'border-l-amber-400',
  '가동률': 'border-l-purple-400',
  '투입/구매량': 'border-l-rose-400',
};

function renderSummaryWithRefs(
  text: string,
  articles: Article[],
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

export default function CustomerNewsPanel({
  articles,
  answer,
  loading,
  error,
  accentColor = '#3b82f6',
}: CustomerNewsPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">관련 뉴스</h3>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="animate-pulse rounded-lg border bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
            <div className="mb-2 h-3 w-20 rounded bg-gray-200 dark:bg-gray-600" />
            <div className="mb-1.5 h-3 w-full rounded bg-gray-100 dark:bg-gray-600" />
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-600" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
              <div className="mb-1.5 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="h-2.5 w-1/4 rounded bg-gray-100 dark:bg-gray-600" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="space-y-2.5">
          {/* AI Summary with numbered references */}
          {answer && (
            <div
              className="rounded-xl border-l-4 bg-white p-4 shadow-sm dark:bg-gray-700/50"
              style={{ borderLeftColor: accentColor }}
            >
              <h4 className="mb-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">AI 요약</h4>
              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                {renderSummaryWithRefs(answer, articles, accentColor)}
              </p>
            </div>
          )}

          {/* Numbered article list */}
          {articles.slice(0, 5).map((article, i) => {
            const cats = article.categories ?? [];
            const borderClass = cats.length > 0 ? `border-l-2 ${CATEGORY_BORDER[cats[0]]}` : '';

            return (
              <a
                key={i}
                href={article.url && article.url !== '#' ? article.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-start gap-3 rounded-lg border bg-white p-3 transition-all hover:shadow-md dark:border-gray-600 dark:bg-gray-700/50 dark:hover:bg-gray-700 ${borderClass}`}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 text-xs font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                    {article.title}
                  </h4>
                  {/* Category tags */}
                  {cats.length > 0 && (
                    <div className="mb-1 flex flex-wrap gap-1">
                      {cats.map((cat) => (
                        <span
                          key={cat}
                          className={`inline-block rounded-full px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[cat]}`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                    <span>{article.source}</span>
                    {article.publishedDate && (
                      <span>{new Date(article.publishedDate).toLocaleDateString('ko-KR')}</span>
                    )}
                    {article.url && article.url !== '#' && (
                      <span className="ml-auto text-blue-500 group-hover:underline">원문 보기</span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}

          {articles.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">뉴스가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
