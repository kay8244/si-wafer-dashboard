/**
 * Shared data generation utilities for mock data.
 * Used by supply-chain-mock, customer-detail-mock, ServerLeadingIndicators, MemoryPriceIndicators.
 */

/** Deterministic seed-based pseudo-random to avoid SSR hydration mismatch */
export function seededValue(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Generate an array of recent month strings (e.g., "2025-03") */
export function getRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

/**
 * Generate a time series between startVal and endVal with
 * deterministic noise controlled by volatilityPct and seed.
 */
export function generateTimeSeries(
  count: number,
  startVal: number,
  endVal: number,
  volatilityPct: number,
  seed: number,
): number[] {
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1);
    const trend = startVal + (endVal - startVal) * progress;
    const noise = (seededValue(seed + i * 7) - 0.5) * 2 * volatilityPct * Math.abs(trend);
    values.push(trend + noise);
  }
  return values;
}
