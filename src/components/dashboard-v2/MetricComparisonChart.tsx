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
import { CurrencyMode, KRW_MAP, formatAxisValue } from '@/lib/chart-utils';

interface MetricComparisonChartProps {
  companies: Record<CompanyId, CompanyFinancialData>;
  metric: MetricKey;
}

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

  const krwField = KRW_MAP[metric as keyof typeof KRW_MAP] as keyof typeof companies[CompanyId]['quarterlies'][number];

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
    <section className="mb-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          분기별 {METRIC_LABELS[metric]} 비교
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrencyMode('krw')}
            className={`pb-1 text-sm transition-colors ${
              currencyMode === 'krw'
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            원화(KRW)
          </button>
          <button
            onClick={() => setCurrencyMode('original')}
            className={`pb-1 text-sm transition-colors ${
              currencyMode === 'original'
                ? 'border-b-2 border-blue-600 font-medium text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            현지통화
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 10 }}>
            <CartesianGrid stroke="#e2e8f0" />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 13 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 13 }}
              tickLine={false}
              tickFormatter={(v: number) => formatAxisValue(v, currencyMode)}
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
              contentStyle={{ fontSize: 13 }}
            />
            <Legend
              formatter={(value: string) => {
                const company = COMPANIES[value as CompanyId];
                return company?.nameKo || value;
              }}
              wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
            />
            {COMPANY_IDS.map((id) => (
              <Bar
                key={id}
                dataKey={id}
                fill={COMPANIES[id].color}
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-4 text-xs text-slate-400">
          {currencyMode === 'krw'
            ? '※ 각 분기 마지막 거래일 환율 기준 원화 환산'
            : '※ 각 기업의 보고 통화 기준'}
        </p>
      </div>
    </section>
  );
}
