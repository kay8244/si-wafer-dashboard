'use client';

import { useState, useEffect, useCallback } from 'react';

interface SectionData {
  title: string;
  brief: string;
  detail: string;
}

interface TranscriptData {
  quarter: string;
  summary: string;
  structured?: { sections: SectionData[] };
  excelUrl: string;
  pdfUrl: string;
  sources?: { title: string; url: string }[];
}

/** Short display name per customer */
const SHORT_NAME: Record<string, string> = {
  SEC: 'SEC',
  SKHynix: 'SKHY',
  Micron: 'Micron',
  Koxia: 'Kioxia',
  SEC_Foundry: 'SEC - 파운드리',
  TSMC: 'TSMC',
  SMC: 'SMIC',
  GFS: 'GFs',
  STM: 'STM',
  Intel: 'Intel',
};

interface Props {
  customerId: string;
  customerLabel?: string;
  transcript?: TranscriptData;
}

function ExpandableSection({ section }: { section: SectionData }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <span className="mt-0.5 text-[10px] text-gray-400">{expanded ? '▼' : '▶'}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{section.title}</span>
          <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">{section.brief}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-6 pb-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line">
          {section.detail}
        </div>
      )}
    </div>
  );
}

function downloadExcel(companyName: string, quarter: string, sections: SectionData[]) {
  // Generate TSV (Tab-Separated Values) that Excel can open
  const header = '구분\t요약\t상세';
  const rows = sections.map((s) => `${s.title}\t${s.brief}\t${s.detail.replace(/\n/g, ' ')}`);
  const meta = `${companyName} Conference Call Transcript - ${quarter}`;
  const content = `${meta}\n\n${header}\n${rows.join('\n')}`;

  const BOM = '\uFEFF'; // UTF-8 BOM for Excel Korean support
  const blob = new Blob([BOM + content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript_${companyName}_${quarter}.tsv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Client-side cache — persists across customer switches within the session
const clientCache = new Map<string, TranscriptData>();

export default function TranscriptSummary({ customerId, customerLabel, transcript: staticTranscript }: Props) {
  const cached = clientCache.get(customerId);
  const [data, setData] = useState<TranscriptData | null>(cached ?? staticTranscript ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already cached client-side, use immediately
    if (clientCache.has(customerId)) {
      setData(clientCache.get(customerId)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(staticTranscript ?? null); // Show static fallback while loading
    fetch(`/api/transcript?customer=${encodeURIComponent(customerId)}`)
      .then((res) => res.json())
      .then((result: TranscriptData) => {
        if (!cancelled && (result.summary || result.structured)) {
          clientCache.set(customerId, result);
          setData(result);
        }
      })
      .catch(() => {
        if (!cancelled && staticTranscript) setData(staticTranscript);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerId, staticTranscript]);

  const handleExcelDownload = useCallback(() => {
    if (!data?.structured?.sections) return;
    downloadExcel(customerId, data.quarter, data.structured.sections);
  }, [data, customerId]);

  if (!data && !loading) return null;

  const sections = data?.structured?.sections;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Title — large like 재무실적 */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Earnings Transcript
          {SHORT_NAME[customerId] && (
            <span className="ml-1.5 text-[11px] font-normal text-gray-400 dark:text-gray-500">({SHORT_NAME[customerId]})</span>
          )}
        </h3>
        {/* Sub row: quarter badge + buttons */}
        <div className="mt-2 flex items-center gap-2">
          {data?.quarter && (
            <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {data.quarter}
            </span>
          )}
          {sections && sections.length > 0 && (
            <button
              onClick={handleExcelDownload}
              className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel
            </button>
          )}
          {data?.pdfUrl && (
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              원문
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {loading && !data ? (
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            <span className="text-xs text-gray-400">Transcript 요약 중...</span>
          </div>
        ) : sections && sections.length > 0 ? (
          /* Structured expandable sections */
          <div>
            {sections.map((section) => (
              <ExpandableSection key={section.title} section={section} />
            ))}
          </div>
        ) : (
          /* Fallback: plain text */
          <div className="px-3 py-2">
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line">
              {data?.summary}
            </p>
          </div>
        )}

        {/* Source links */}
        {data?.sources && data.sources.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
            {data.sources.slice(0, 2).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[10px] text-blue-500 hover:underline dark:text-blue-400"
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
