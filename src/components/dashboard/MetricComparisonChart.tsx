'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CompanyFinancialData, CompanyId } from '@/types/company';
import { MetricKey, ChartDataPoint } from '@/types/dashboard';
import { COMPANIES, COMPANY_IDS, METRIC_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

interface MetricComparisonChartProps {
  companies: Record<CompanyId, CompanyFinancialData>;
  metric: MetricKey;
}

type CurrencyMode = 'original' | 'krw';

const KRW_METRIC_MAP: Record<MetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

function buildChartData(
  companies: Record<CompanyId, CompanyFinancialData>,
  metric: MetricKey,
  mode: CurrencyMode
): ChartDataPoint[] {
  const quarterSet = new Set<string>();
  COMPANY_IDS.forEach((id) => {
    companies[id].quarterlies.forEach((q) => quarterSet.add(q.quarter));
  });

  const quarters = Array.from(quarterSet).sort();
  const recentQuarters = quarters.slice(-8);

  const krwField = KRW_METRIC_MAP[metric] as keyof typeof companies[CompanyId]['quarterlies'][number];

  return recentQuarters.map((quarter) => {
    const point: ChartDataPoint = { quarter };
    COMPANY_IDS.forEach((id) => {
      const q = companies[id].quarterlies.find((q) => q.quarter === quarter);
      if (mode === 'krw') {
        point[id] = q ? (q[krwField] as number) : 0;
      } else {
        point[id] = q ? q[metric] : 0;
      }
    });
    return point;
  });
}

export default function MetricComparisonChart({
  companies,
  metric,
}: MetricComparisonChartProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');
  const data = buildChartData(companies, metric, currencyMode);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          분기별 {METRIC_LABELS[metric]} 비교
        </h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setCurrencyMode('krw')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'krw'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            원화(KRW)
          </button>
          <button
            onClick={() => setCurrencyMode('original')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'original'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            현지통화
          </button>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">
          {currencyMode === 'krw'
            ? '※ 각 분기 마지막 거래일 환율 기준 원화 환산'
            : '※ 각 기업의 보고 통화 기준'}
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (currencyMode === 'krw') {
                  const abs = Math.abs(v);
                  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
                  if (abs >= 1e8) return `${(v / 1e8).toFixed(0)}억`;
                  return String(v);
                }
                if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
                if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                return String(v);
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                const companyId = name as CompanyId;
                const company = COMPANIES[companyId];
                const currency = currencyMode === 'krw' ? 'KRW' : company.currency;
                return [
                  formatCurrency(Number(value), currency),
                  company.nameKo,
                ];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) => {
                const company = COMPANIES[value as CompanyId];
                return company?.nameKo || value;
              }}
            />
            {COMPANY_IDS.map((id) => (
              <Bar
                key={id}
                dataKey={id}
                fill={COMPANIES[id].color}
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
