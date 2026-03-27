/** Shared chart utilities for supply-chain indicator charts */

export interface OverlayLine {
  name: string;
  data: { month: string; value: number }[];
  color: string;
}

export type TimeRange = 6 | 12 | 24 | 36;

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 6, label: '6M' },
  { value: 12, label: '12M' },
  { value: 24, label: '24M' },
  { value: 36, label: '36M' },
];

export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

export const SELECTION_COLORS = [
  'bg-blue-50 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-700',
  'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-700',
  'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-700',
];

/** Pearson correlation coefficient between two numeric arrays of equal length */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 3 || n !== y.length) return null;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return num / den;
}

/** Interpret correlation strength */
export function corrLabel(r: number): { text: string; color: string } {
  const abs = Math.abs(r);
  if (abs >= 0.8) return { text: '강한', color: r > 0 ? '#dc2626' : '#2563eb' };
  if (abs >= 0.6) return { text: '보통', color: r > 0 ? '#d97706' : '#7c3aed' };
  if (abs >= 0.4) return { text: '약한', color: '#6b7280' };
  return { text: '미약', color: '#9ca3af' };
}

/** Format large values with K suffix */
export function formatOverlayValue(v: number): string {
  if (Math.abs(v) >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

/** Calculate tight Y-axis domain with 15% padding */
export function tightDomain(values: number[], allowNegative = true): [number, number] | undefined {
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) * 0.1 || 1;
  const pad = range * 0.15;
  const lo = min - pad;
  return [
    allowNegative ? lo : Math.max(0, lo),
    max + pad,
  ];
}

export interface Correlation {
  name: string;
  r: number;
  color: string;
}
