'use client';

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
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

export default function CustomerNewsPanel({
  articles,
  answer,
  loading,
  error,
}: CustomerNewsPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">관련 뉴스</h3>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-1 h-3 w-20 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {!loading && !error && (
        <>
          {answer && (
            <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-2.5">
              <p className="text-xs leading-relaxed text-blue-800">{answer}</p>
            </div>
          )}

          <ul className="space-y-2">
            {articles.slice(0, 5).map((item, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-900">
                    {item.source}
                    {item.publishedDate ? ` ${formatDate(item.publishedDate)}` : ''}
                  </span>
                </div>
                {item.url && item.url !== '#' ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs leading-snug text-blue-700 underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  <p className="text-xs leading-snug text-gray-700">{item.title}</p>
                )}
              </li>
            ))}
          </ul>

          {articles.length === 0 && (
            <p className="text-xs text-gray-400">뉴스가 없습니다.</p>
          )}
        </>
      )}
    </div>
  );
}
