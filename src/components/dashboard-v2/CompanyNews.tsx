'use client';

import { CompanyId } from '@/types/company';
import { useCompanyNews } from '@/hooks/useCompanyNews';
import { renderSummaryWithRefs } from '@/lib/chart-utils';

interface CompanyNewsProps {
  companyId: CompanyId;
  companyName: string;
  companyColor: string;
  onClose: () => void;
}

export default function CompanyNews({
  companyId,
  companyName,
  companyColor,
  onClose,
}: CompanyNewsProps) {
  const { articles, answer, loading, error } = useCompanyNews(companyId);

  return (
    <section className="mb-10">
      {/* Header */}
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
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          차트로 돌아가기
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
            <div className="mb-2 h-3 w-full rounded bg-slate-100" />
            <div className="mb-2 h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-3/4 rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-2 h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && articles.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">관련 뉴스가 없습니다.</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && articles.length > 0 && (
        <div className="space-y-4">
          {/* AI Summary */}
          {answer && (
            <div
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
              style={{ borderLeftWidth: 4, borderLeftColor: companyColor }}
            >
              <h3 className="mb-2 text-sm font-bold text-slate-800">AI 요약</h3>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {renderSummaryWithRefs(answer, articles, companyColor)}
              </p>
            </div>
          )}

          {/* Article list */}
          <div className="space-y-3">
            {articles.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md"
              >
                <span
                  className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: companyColor }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 text-base font-medium text-slate-900 group-hover:text-blue-600">
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
        </div>
      )}
    </section>
  );
}
