'use client';

interface DashboardHeaderProps {
  lastUpdated: string | null;
  onRefresh: () => void;
  loading: boolean;
}

export default function DashboardHeader({ lastUpdated, onRefresh, loading }: DashboardHeaderProps) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <header className="mb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            SI 웨이퍼 대시보드
          </h1>
          {formattedDate && (
            <p className="mt-1.5 text-sm text-slate-400">
              마지막 업데이트: {formattedDate}
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>
    </header>
  );
}
