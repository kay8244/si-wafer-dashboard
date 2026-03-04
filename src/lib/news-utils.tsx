'use client';

import { ReactNode } from 'react';

export interface NewsArticleRef {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

/**
 * Parse AI-generated answer into bullet points.
 * Prefers line-based "- " bullets, falls back to sentence splitting.
 */
export function parseAiBullets(answer: string | null | undefined, maxItems?: number): string[] {
  if (!answer) return [];
  const lines = answer
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length > 1) return maxItems ? lines.slice(0, maxItems) : lines;
  const sentences = answer
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter((s) => s && !s.startsWith('#'));
  return maxItems ? sentences.slice(0, maxItems) : sentences;
}

/**
 * Render text with clickable [N] reference circles that link to articles.
 */
export function renderWithRefs(
  text: string,
  articles: NewsArticleRef[],
  accentColor: string,
): ReactNode {
  const parts = text.split(/\[(\d+)\]/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const refIdx = parseInt(part) - 1;
          const article = articles[refIdx];
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
