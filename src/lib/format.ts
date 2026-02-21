const CURRENCY_FORMATTERS: Record<string, (value: number) => string> = {
  USD: formatWestern,
  JPY: formatJPY,
  TWD: formatWestern,
  EUR: formatWestern,
  KRW: formatKRW,
};

function formatJPY(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}¥${(abs / 1_000_000_000_000).toFixed(2)}조`;
  }
  if (abs >= 100_000_000) {
    return `${sign}¥${(abs / 100_000_000).toFixed(1)}억`;
  }
  if (abs >= 10_000) {
    return `${sign}¥${(abs / 10_000).toFixed(0)}만`;
  }
  return `${sign}¥${abs.toLocaleString('ko-KR')}`;
}

function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}₩${(abs / 1_000_000_000_000).toFixed(2)}조`;
  }
  if (abs >= 100_000_000) {
    return `${sign}₩${(abs / 100_000_000).toFixed(0)}억`;
  }
  if (abs >= 10_000) {
    return `${sign}₩${(abs / 10_000).toFixed(0)}만`;
  }
  return `${sign}₩${abs.toLocaleString('ko-KR')}`;
}

function formatWestern(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}${abs.toLocaleString('ko-KR')}`;
}

export function formatCurrency(value: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : currency === 'JPY' ? '¥' : currency === 'EUR' ? '€' : currency === 'KRW' ? '₩' : 'NT$';
  const formatter = CURRENCY_FORMATTERS[currency] || formatWestern;
  const formatted = formatter(value);

  // JPY and KRW formatters already include their symbol
  if (currency === 'JPY' || currency === 'KRW') return formatted;
  return `${symbol}${formatted}`;
}

export function formatCurrencyOrNA(value: number, currency: string): string {
  if (value === 0) return 'N/A';
  return formatCurrency(value, currency);
}

export function formatPercent(value: number | null): string {
  if (value === null || !isFinite(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

export function formatQuarter(quarter: string): string {
  return quarter; // Already formatted as "2024 Q3"
}

export function formatExchangeRate(rate: number, currency: string): string {
  if (rate === 0) return '-';
  if (currency === 'JPY') return `¥100 = ₩${(rate * 100).toFixed(0)}`;
  if (currency === 'TWD') return `NT$1 = ₩${rate.toFixed(1)}`;
  if (currency === 'EUR') return `€1 = ₩${rate.toFixed(0)}`;
  if (currency === 'USD') return `$1 = ₩${rate.toFixed(0)}`;
  return `1 ${currency} = ₩${rate.toFixed(0)}`;
}

export function formatDays(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value}일`;
}

export function formatASP(value: number | null): string {
  if (value === null) return 'N/A';
  return `$${value.toFixed(2)}/Gb`;
}
