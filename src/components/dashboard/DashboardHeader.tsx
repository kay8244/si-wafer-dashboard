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
    <header className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            SI 웨이퍼 5개사 실적 대시보드
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            신에츠화학 · SUMCO · 글로벌웨이퍼스 · 실트로닉 · SK실트론 분기별 실적 비교
          </p>
        </div>
        <div className="flex items-center gap-3">
          {formattedDate && (
            <span className="text-xs text-gray-400">
              마지막 업데이트: {formattedDate}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '로딩 중...' : '데이터 새로고침'}
          </button>
        </div>
      </div>
    </header>
  );
}
