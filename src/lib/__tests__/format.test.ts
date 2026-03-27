import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyOrNA,
  formatPercent,
  formatNumber,
  formatExchangeRate,
  formatDays,
  formatASP,
} from '../format';

describe('formatCurrency', () => {
  it('formats USD billions', () => {
    expect(formatCurrency(5_400_000_000, 'USD')).toBe('$5.40B');
  });

  it('formats USD millions', () => {
    expect(formatCurrency(12_500_000, 'USD')).toBe('$12.5M');
  });

  it('formats USD thousands', () => {
    expect(formatCurrency(8_500, 'USD')).toBe('$9K');
  });

  it('formats KRW 조', () => {
    expect(formatCurrency(3_000_000_000_000, 'KRW')).toBe('₩3.00조');
  });

  it('formats KRW 억', () => {
    expect(formatCurrency(500_000_000, 'KRW')).toBe('₩5억');
  });

  it('formats KRW 만', () => {
    expect(formatCurrency(50_000, 'KRW')).toBe('₩5만');
  });

  it('formats JPY 조', () => {
    expect(formatCurrency(2_000_000_000_000, 'JPY')).toBe('¥2.00조');
  });

  it('formats JPY 억', () => {
    expect(formatCurrency(300_000_000, 'JPY')).toBe('¥3.0억');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-1_000_000_000, 'USD')).toBe('$-1.00B');
  });

  it('formats TWD with NT$ symbol', () => {
    expect(formatCurrency(2_000_000_000, 'TWD')).toBe('NT$2.00B');
  });

  it('formats EUR with symbol', () => {
    expect(formatCurrency(5_000_000, 'EUR')).toBe('€5.0M');
  });
});

describe('formatCurrencyOrNA', () => {
  it('returns N/A for zero', () => {
    expect(formatCurrencyOrNA(0, 'USD')).toBe('N/A');
  });

  it('formats non-zero values normally', () => {
    expect(formatCurrencyOrNA(1_000_000, 'USD')).toBe('$1.0M');
  });
});

describe('formatPercent', () => {
  it('formats positive with + sign', () => {
    expect(formatPercent(12.34)).toBe('+12.3%');
  });

  it('formats negative without + sign', () => {
    expect(formatPercent(-5.67)).toBe('-5.7%');
  });

  it('returns N/A for null', () => {
    expect(formatPercent(null)).toBe('N/A');
  });

  it('returns N/A for Infinity', () => {
    expect(formatPercent(Infinity)).toBe('N/A');
  });

  it('formats zero without sign', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatNumber', () => {
  it('formats with Korean locale separators', () => {
    const result = formatNumber(1234567);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('567');
  });
});

describe('formatExchangeRate', () => {
  it('returns dash for zero rate', () => {
    expect(formatExchangeRate(0, 'USD')).toBe('-');
  });

  it('formats USD exchange rate', () => {
    expect(formatExchangeRate(1350, 'USD')).toBe('$1 = ₩1350');
  });

  it('formats JPY exchange rate (per 100)', () => {
    expect(formatExchangeRate(9.2, 'JPY')).toBe('¥100 = ₩920');
  });

  it('formats TWD exchange rate', () => {
    expect(formatExchangeRate(42.5, 'TWD')).toBe('NT$1 = ₩42.5');
  });

  it('formats EUR exchange rate', () => {
    expect(formatExchangeRate(1450, 'EUR')).toBe('€1 = ₩1450');
  });
});

describe('formatDays', () => {
  it('formats days with suffix', () => {
    expect(formatDays(30)).toBe('30일');
  });

  it('returns N/A for null', () => {
    expect(formatDays(null)).toBe('N/A');
  });
});

describe('formatASP', () => {
  it('formats ASP with dollar and unit', () => {
    expect(formatASP(3.45)).toBe('$3.45/Gb');
  });

  it('returns N/A for null', () => {
    expect(formatASP(null)).toBe('N/A');
  });
});
