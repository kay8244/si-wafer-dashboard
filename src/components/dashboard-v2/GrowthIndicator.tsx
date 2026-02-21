'use client';

import { formatPercent } from '@/lib/format';

interface GrowthIndicatorProps {
  value: number | null;
  label: string;
}

export default function GrowthIndicator({ value, label }: GrowthIndicatorProps) {
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;

  const colorClass = isPositive
    ? 'bg-emerald-50 text-emerald-700'
    : isNegative
      ? 'bg-rose-50 text-rose-700'
      : 'bg-slate-100 text-slate-500';

  const arrow = isPositive ? '▲' : isNegative ? '▼' : '';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}
    >
      {arrow && <span className="text-xs">{arrow}</span>}
      {formatPercent(value)}
      <span className="text-xs opacity-70">{label}</span>
    </span>
  );
}
