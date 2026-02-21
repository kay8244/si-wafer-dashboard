'use client';

import { ReactNode } from 'react';
import { FoundryCustomerId } from '@/types/foundry-customer';
import { useFoundryCustomerNews, NewsArticle } from '@/hooks/useFoundryCustomerNews';

function renderSummaryWithRefs(
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

interface FoundryCustomerNewsProps {
  customerId: FoundryCustomerId;
  companyName: string;
  companyColor: string;
  onClose: () => void;
}

export default function FoundryCustomerNews({
  customerId,
  companyName,
  companyColor,
  onClose,
}: FoundryCustomerNewsProps) {
  const { articles, answer, loading, error } = useFoundryCustomerNews(customerId);

  return (
    <section className="mb-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: companyColor }}
          />
          <h2 className="text-lg font-semibold text-slate-800">
            {companyName} 관련 뉴스
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          차트로 돌아가기
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
            <div className="mb-2 h-3 w-full rounded bg-slate-100" />
            <div className="mb-2 h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-3/4 rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-2 h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500">관련 뉴스가 없습니다.</p>
        </div>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="space-y-4">
          {answer && (
            <div
              className="rounded-2xl border-l-4 border border-slate-200 bg-white p-6 shadow-sm"
              style={{ borderLeftColor: companyColor }}
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-800">AI 요약</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {renderSummaryWithRefs(answer, articles, companyColor)}
              </p>
            </div>
          )}

          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md"
            >
              <span
                className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: companyColor }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="mb-2 text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                  {article.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{article.source}</span>
                  {article.publishedDate && (
                    <span>
                      {new Date(article.publishedDate).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                  <span className="ml-auto text-blue-500 group-hover:underline">
                    원문 보기
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
