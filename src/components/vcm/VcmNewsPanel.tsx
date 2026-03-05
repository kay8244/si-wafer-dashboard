'use client';

import { useMemo, useState } from 'react';
import type { VcmNews } from '@/types/indicators';
import type { NewsArticle } from '@/hooks/useNews';
import { parseAiBullets, CollapsibleBullet, SourceBadge } from '@/lib/news-utils';
import type { NewsArticleRef } from '@/lib/news-utils';

interface VcmNewsPanelProps {
  news?: VcmNews[];
  articles?: NewsArticle[];
  answer?: string | null;
  loading?: boolean;
  accentColor?: string;
}

export default function VcmNewsPanel({
  news,
  articles,
  answer,
  loading,
  accentColor = '#3b82f6',
}: VcmNewsPanelProps) {
  const showRealNews = articles !== undefined;
  const [articlesExpanded, setArticlesExpanded] = useState(false);
  const bullets = useMemo(() => parseAiBullets(answer ?? ''), [answer]);

  const articleList = showRealNews ? (articles ?? []).slice(0, 5) : [];
  const mockList = !showRealNews ? (news ?? []).slice(0, 5) : [];
  const totalArticles = showRealNews ? articleList.length : mockList.length;

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-4 pt-4 pb-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
            관련 News
          </h3>
        </div>
      </div>

      {/* Content area - scrollable */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Loading skeleton */}
        {loading && (
          <div className="p-4">
            <div
              className="rounded-lg border-l-4 bg-gradient-to-r from-gray-50 to-white p-4 dark:from-gray-700/50 dark:to-gray-800"
              style={{ borderLeftColor: accentColor }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300" style={{ borderTopColor: accentColor }} />
                <span className="text-xs font-bold" style={{ color: accentColor }}>AI 요약</span>
              </div>
              <div className="animate-pulse space-y-2.5">
                <div className="h-3.5 w-5/6 rounded bg-gray-200 dark:bg-gray-600" />
                <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
                <div className="h-3.5 w-4/6 rounded bg-gray-200 dark:bg-gray-600" />
              </div>
              <p className="mt-2.5 text-[11px] text-gray-400">기사를 수집하고 AI 요약을 생성하고 있습니다...</p>
            </div>
          </div>
        )}

        {/* AI Summary - always visible first */}
        {!loading && bullets.length > 0 && (
          <div className="shrink-0 p-4 pb-2">
            <div
              className="rounded-lg border-l-4 bg-gradient-to-r from-gray-50 to-white p-4 dark:from-gray-700/50 dark:to-gray-800"
              style={{ borderLeftColor: accentColor }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" style={{ color: accentColor }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                </svg>
                <span className="text-xs font-bold" style={{ color: accentColor }}>AI 요약</span>
              </div>
              <ul className="space-y-2 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                {bullets.map((bullet, idx) => (
                  <CollapsibleBullet key={idx} text={bullet} articles={articleList as NewsArticleRef[]} accentColor={accentColor} />
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Articles section - visible on scroll */}
        {!loading && totalArticles > 0 && (
          <div className="flex flex-col px-4 pb-4">
            {/* Toggle button */}
            <button
              onClick={() => setArticlesExpanded(!articlesExpanded)}
              className="mb-2 flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <svg
                className={`h-3 w-3 transition-transform ${articlesExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              관련 기사 {totalArticles}건
            </button>

            {articlesExpanded && (
              <div className="flex flex-col gap-2">
                {/* Real articles */}
                {showRealNews && articleList.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2.5 rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 text-[13px] font-semibold leading-snug text-gray-800 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <SourceBadge source={article.source} size="xs" />
                        {article.publishedDate && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span>{new Date(article.publishedDate).toLocaleDateString('ko-KR')}</span>
                          </>
                        )}
                        <span className="ml-auto text-blue-500 opacity-0 transition-opacity group-hover:opacity-100">
                          원문 &rarr;
                        </span>
                      </div>
                    </div>
                  </a>
                ))}

                {/* Fallback mock articles */}
                {!showRealNews && mockList.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-600 dark:bg-gray-700/50"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 text-[13px] font-semibold leading-snug text-gray-800 dark:text-gray-100">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                        <SourceBadge source={item.source} size="xs" />
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && totalArticles === 0 && !answer && (
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">뉴스가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
