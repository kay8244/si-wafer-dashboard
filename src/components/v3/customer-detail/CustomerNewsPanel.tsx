'use client';

import { ReactNode, useState, useMemo } from 'react';

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
  customerLabel?: string;
}

export default function CustomerNewsPanel({
  articles,
  answer,
  loading,
  error,
  accentColor = '#3b82f6',
  customerLabel,
}: CustomerNewsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const list = articles.slice(0, 10);

  // Clean label: pick one name only, avoid double parentheses like "(SEC (삼성전자))"
  const cleanLabel = useMemo(() => {
    if (!customerLabel) return null;
    const match = customerLabel.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      const [, prefix, inner] = match;
      // Korean inside parens → use Korean name (e.g., "삼성전자")
      if (/[가-힣]/.test(inner)) return inner;
      // English inside parens → use prefix (e.g., "GFS", "Intel")
      return prefix;
    }
    return customerLabel;
  }, [customerLabel]);

  // Parse answer into bullet points
  const bullets = useMemo(() => {
    if (!answer) return [];
    const lines = answer
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l);
    if (lines.length > 1) return lines.slice(0, 4);
    return answer
      .split(/(?<=[.!?。])\s+/)
      .filter((s) => s.trim())
      .map((s) => s.trim())
      .slice(0, 4);
  }, [answer]);

  /** Render text with clickable [N] reference circles */
  function renderWithRefs(text: string): ReactNode {
    const parts = text.split(/\[(\d+)\]/g);
    if (parts.length === 1) return <>{text}</>;
    return (
      <>
        {parts.map((part, i) => {
          if (i % 2 === 1) {
            const refIdx = parseInt(part) - 1;
            const article = list[refIdx];
            if (article) {
              return (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white align-text-top mx-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: accentColor }}
                  title={article.title}
                >
                  {refIdx + 1}
                </a>
              );
            }
            return <span key={i}>[{part}]</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <p className="text-xs text-gray-400">뉴스 분석 중...</p>
        </div>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!answer && list.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* AI Summary — bullet format with clickable refs */}
      {bullets.length > 0 && (
        <div
          className="rounded-lg border-l-4 bg-gradient-to-r from-gray-50 to-white p-3 dark:from-gray-700/50 dark:to-gray-800"
          style={{ borderLeftColor: accentColor }}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: accentColor }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            <span className="text-xs font-bold" style={{ color: accentColor }}>
              AI 기사 요약{cleanLabel ? ` (${cleanLabel})` : ''}
            </span>
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex gap-1.5">
                <span className="mt-0.5 shrink-0 text-gray-400">•</span>
                <span>{renderWithRefs(bullet)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collapsible articles */}
      {list.length > 0 && (
        <div className={bullets.length > 0 ? 'mt-2' : ''}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            관련 기사 {list.length}건
          </button>

          {expanded && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {list.map((article, i) => (
                <a
                  key={i}
                  href={article.url && article.url !== '#' ? article.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-2.5 transition-all hover:border-gray-200 hover:shadow-sm dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500"
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold leading-snug text-gray-800 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                      {article.title}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                      <span className="font-medium text-gray-500 dark:text-gray-400">
                        {article.source}
                      </span>
                      {article.publishedDate && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>
                            {new Date(article.publishedDate).toLocaleDateString('ko-KR')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
