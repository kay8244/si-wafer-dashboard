'use client';

import { corrLabel, type Correlation } from '@/lib/chart-utils';

interface Props {
  correlations: Correlation[];
  isDark: boolean;
}

export default function CorrelationBadges({ correlations, isDark }: Props) {
  if (correlations.length === 0) return null;

  return (
    <div className="absolute top-7 right-24 z-10 flex flex-col gap-1">
      {correlations.map((c) => {
        const info = corrLabel(c.r);
        return (
          <div
            key={c.name}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm"
            style={{
              borderColor: c.color + '40',
              backgroundColor: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.9)',
            }}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span style={{ color: isDark ? '#e2e8f0' : '#374151' }}>{c.name.split(' (')[0]}</span>
            <span style={{ color: info.color, fontWeight: 700 }}>r={c.r >= 0 ? '+' : ''}{c.r.toFixed(2)}</span>
            <span style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>({info.text} {c.r >= 0 ? '양' : '음'}의 상관)</span>
          </div>
        );
      })}
    </div>
  );
}
