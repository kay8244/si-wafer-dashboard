'use client';

import { renderSummaryWithRefs, NewsArticle } from '@/lib/chart-utils';

interface GenericNewsPanelProps {
  title: string;
  color: string;
  articles: NewsArticle[];
  answer: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export default function GenericNewsPanel({
  title,
  color,
  articles,
  answer,
  loading,
  error,
  onClose,
}: GenericNewsPanelProps) {
  return (
    <section className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-lg font-bold text-gray-800">
            {title} 관련 뉴스
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          차트로 돌아가기
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="animate-pulse rounded-xl border bg-white p-6">
            <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
            <div className="mb-2 h-3 w-full rounded bg-gray-100" />
            <div className="mb-2 h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-3/4 rounded bg-gray-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-white p-4">
                <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/4 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="rounded-xl border bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">관련 뉴스가 없습니다.</p>
        </div>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="space-y-4">
          {answer && (
            <div
              className="rounded-xl border-l-4 bg-white p-5 shadow-sm"
              style={{ borderLeftColor: color }}
            >
              <h3 className="mb-2 text-sm font-bold text-gray-800">AI 요약</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {renderSummaryWithRefs(answer, articles, color)}
              </p>
            </div>
          )}

          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-lg border bg-white p-4 transition-all hover:shadow-md"
            >
              <span
                className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="mb-1 text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                  {article.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-400">
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
