'use client';

import type { VcmNews } from '@/types/v2';
import type { NewsArticle } from '@/hooks/useV2News';

interface VcmNewsPanelProps {
  news?: VcmNews[];
  articles?: NewsArticle[];
  answer?: string | null;
  loading?: boolean;
}

function getRelativeDate(publishedDate: string | null): string {
  if (!publishedDate) return '';
  const date = new Date(publishedDate);
  if (isNaN(date.getTime())) return publishedDate;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '1일 전';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}

export default function VcmNewsPanel({ news, articles, answer, loading }: VcmNewsPanelProps) {
  const showRealNews = articles !== undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col h-full">
      <h3 className="font-semibold text-sm text-gray-800 mb-3">관련 News 및 기사</h3>

      {loading && (
        <div className="flex items-center justify-center flex-1">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && showRealNews && (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
          {answer && (
            <div className="rounded bg-blue-50 border border-blue-200 p-2 text-xs text-blue-900 leading-snug">
              {answer}
            </div>
          )}
          {(articles ?? []).slice(0, 5).map((item, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded text-xs font-medium">
                  {item.source}
                </span>
                <span className="text-xs text-gray-400">{getRelativeDate(item.publishedDate)}</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-700 leading-snug hover:text-blue-600 hover:underline"
              >
                {item.title}
              </a>
            </div>
          ))}
          {(articles ?? []).length === 0 && (
            <p className="text-xs text-gray-400">뉴스가 없습니다.</p>
          )}
        </div>
      )}

      {!loading && !showRealNews && (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
          {(news ?? []).slice(0, 5).map((item, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded text-xs font-medium">
                  {item.source}
                </span>
                <span className="text-xs text-gray-400">{item.date}</span>
              </div>
              <p className="text-xs text-gray-700 leading-snug">{item.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
