'use client';

import { ReactNode } from 'react';

interface Article {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

interface CustomerNewsPanelProps {
  articles: Article[];
  answer?: string | null;
  loading?: boolean;
  error?: string | null;
  accentColor?: string;
}

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
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white no-underline hover:opacity-80"
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">관련 뉴스</h3>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="animate-pulse rounded-lg border bg-white p-4">
            <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
            <div className="mb-1.5 h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-3/4 rounded bg-gray-100" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border bg-white p-3">
              <div className="mb-1.5 h-3 w-2/3 rounded bg-gray-200" />
              <div className="h-2.5 w-1/4 rounded bg-gray-100" />
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
        <div className="space-y-3">
          {/* AI Summary with numbered references */}
          {answer && (
            <div
              className="rounded-xl border-l-4 bg-white p-4 shadow-sm"
              style={{ borderLeftColor: accentColor }}
            >
              <h4 className="mb-1.5 text-xs font-bold text-gray-800">AI 요약</h4>
              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">
                {renderSummaryWithRefs(answer, articles, accentColor)}
              </p>
            </div>
          )}

          {/* Numbered article list */}
          {articles.slice(0, 5).map((article, i) => (
            <a
              key={i}
              href={article.url && article.url !== '#' ? article.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border bg-white p-3 transition-all hover:shadow-md"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="mb-1 text-xs font-semibold text-gray-900 group-hover:text-blue-600">
                  {article.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
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
          ))}

          {articles.length === 0 && (
            <p className="text-xs text-gray-400">뉴스가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
