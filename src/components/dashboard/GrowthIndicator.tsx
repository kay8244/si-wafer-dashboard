'use client';

import { formatPercent } from '@/lib/format';

interface GrowthIndicatorProps {
  value: number | null;
  label: string;
}

export default function GrowthIndicator({ value, label }: GrowthIndicatorProps) {
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;

  const bgColor = isPositive
    ? 'bg-green-100 text-green-700'
    : isNegative
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-500';

  const arrow = isPositive ? '▲' : isNegative ? '▼' : '';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgColor}`}>
      <span className="text-[11px]">{arrow}</span>
      {formatPercent(value)}
      <span className="text-[11px] opacity-70">{label}</span>
    </span>
  );
}
