'use client';

import { ReactNode, useState } from 'react';

export interface NewsArticleRef {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

/** High-credibility sources get a highlighted badge */
const PREMIUM_SOURCES = new Set([
  'Bloomberg', 'Reuters', 'Gartner', 'Omdia', 'TrendForce', 'IDC',
  'Digitimes', 'TheElec', 'SEMI', 'IC Insights',
]);

export function isPremiumSource(source: string): boolean {
  return PREMIUM_SOURCES.has(source);
}

/** Parse "headline >>> detail [1][2]" format. Falls back to old headline extraction. */
function parseHeadlineDetail(text: string): { headline: string; detail: string; refNums: number[] } {
  // Extract reference numbers
  const refNums: number[] = [];
  const refRegex = /\[(\d+)\]/g;
  let m;
  while ((m = refRegex.exec(text)) !== null) refNums.push(parseInt(m[1], 10) - 1);

  // Try >>> separator first
  const sepIdx = text.indexOf('>>>');
  if (sepIdx > 0) {
    const headline = text.slice(0, sepIdx).replace(/\[\d+\]/g, '').trim();
    const detail = text.slice(sepIdx + 3).replace(/\[\d+\]/g, '').trim();
    return { headline, detail, refNums };
  }

  // Fallback: first sentence as headline
  const clean = text.replace(/\[\d+\]/g, '').trim();
  const match = clean.match(/^(.{15,}?[.!?。,，])\s*([\s\S]+)$/);
  if (match) return { headline: match[1].trim(), detail: match[2].trim(), refNums };
  return { headline: clean, detail: '', refNums };
}

/** Pick the most credible source from referenced articles */
function pickBestSource(refNums: number[], articles: NewsArticleRef[]): NewsArticleRef | null {
  const refs = refNums.map((i) => articles[i]).filter(Boolean);
  if (refs.length === 0) return articles[0] ?? null;
  // Prefer premium source
  const premium = refs.find((a) => isPremiumSource(a.source));
  return premium ?? refs[0];
}

/** Collapsible bullet: headline + source below + 상세보기 to expand detail */
export function CollapsibleBullet({
  text,
  articles,
  accentColor,
}: {
  text: string;
  articles: NewsArticleRef[];
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const { headline, detail, refNums } = parseHeadlineDetail(text);
  const bestSource = pickBestSource(refNums, articles);
  const hasDetail = detail.length > 0;

  return (
    <li className="flex gap-1.5">
      <span className="mt-0.5 shrink-0 text-gray-400">•</span>
      <div className="flex-1">
        {/* Headline */}
        <div className="flex items-start gap-1.5">
          <span className="text-[15px] font-semibold text-gray-800 dark:text-gray-200 leading-snug flex-1">{headline}</span>
          {/* 상세보기 button */}
          {hasDetail && !open && (
            <button
              className="shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold transition-all hover:opacity-100 opacity-60"
              style={{ color: accentColor, backgroundColor: accentColor + '12' }}
              onClick={() => setOpen(true)}
            >
              상세 ▼
            </button>
          )}
        </div>
        {/* Source badge — below headline, links to original article */}
        {bestSource && (
          <div className="mt-0.5 flex items-center gap-1">
            <a
              href={bestSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <SourceBadge source={bestSource.source} size="xs" />
              <svg className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {bestSource.publishedDate && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className="text-[12px] text-gray-400">{new Date(bestSource.publishedDate).toLocaleDateString('ko-KR')}</span>
              </>
            )}
          </div>
        )}
        {/* Expanded detail */}
        {hasDetail && open && (
          <div
            className="mt-2 rounded-md px-2.5 py-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400"
            style={{ backgroundColor: accentColor + '08', borderLeft: `2px solid ${accentColor}30` }}
          >
            {detail}
            <button
              className="ml-2 text-[10px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: accentColor }}
              onClick={() => setOpen(false)}
            >
              ▲ 접기
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Source badge — highlighted for premium, plain for others */
export function SourceBadge({ source, size = 'sm' }: { source: string; size?: 'sm' | 'xs' }) {
  const premium = isPremiumSource(source);
  const fontSize = size === 'sm' ? 'text-[13px]' : 'text-[12px]';
  if (premium) {
    return (
      <span className={`${fontSize} font-bold text-amber-600 dark:text-amber-400`}>
        {source}
      </span>
    );
  }
  return (
    <span className={`${fontSize} font-medium text-gray-500 dark:text-gray-400`}>
      {source}
    </span>
  );
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
    .split(/([.!?。])\s+/)
    .reduce<string[]>((acc, part, i, arr) => {
      if (i % 2 === 0) {
        const next = arr[i + 1] ?? '';
        const sentence = (part + next).replace(/^[-•*]\s*/, '').trim();
        if (sentence && !sentence.startsWith('#')) acc.push(sentence);
      }
      return acc;
    }, []);
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
