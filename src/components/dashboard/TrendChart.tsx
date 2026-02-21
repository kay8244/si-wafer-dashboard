'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { CompanyFinancialData, CompanyId, QuarterlyFinancial } from '@/types/company';
import { MetricKey, GrowthChartDataPoint } from '@/types/dashboard';
import { COMPANIES, COMPANY_IDS, METRIC_LABELS } from '@/lib/constants';
import { formatPercent } from '@/lib/format';

interface TrendChartProps {
  companies: Record<CompanyId, CompanyFinancialData>;
  metric: MetricKey;
}

function calcYoYGrowth(
  quarterlies: QuarterlyFinancial[],
  metric: MetricKey
): Map<string, number | null> {
  const map = new Map<string, number | null>();

  quarterlies.forEach((q) => {
    const prevYear = quarterlies.find(
      (pq) =>
        pq.period === q.period &&
        pq.calendarYear === String(Number(q.calendarYear) - 1)
    );
    if (prevYear && prevYear[metric] !== 0) {
      const growth = ((q[metric] - prevYear[metric]) / Math.abs(prevYear[metric])) * 100;
      map.set(q.quarter, growth);
    } else {
      map.set(q.quarter, null);
    }
  });

  return map;
}

function buildGrowthData(
  companies: Record<CompanyId, CompanyFinancialData>,
  metric: MetricKey
): GrowthChartDataPoint[] {
  const growthMaps: Record<string, Map<string, number | null>> = {};
  COMPANY_IDS.forEach((id) => {
    growthMaps[id] = calcYoYGrowth(companies[id].quarterlies, metric);
  });

  const quarterSet = new Set<string>();
  COMPANY_IDS.forEach((id) => {
    growthMaps[id].forEach((_, quarter) => quarterSet.add(quarter));
  });

  const quarters = Array.from(quarterSet).sort().slice(-8);

  return quarters.map((quarter) => {
    const point: GrowthChartDataPoint = { quarter };
    COMPANY_IDS.forEach((id) => {
      point[id] = growthMaps[id].get(quarter) ?? null;
    });
    return point;
  });
}

export default function TrendChart({ companies, metric }: TrendChartProps) {
  const data = buildGrowthData(companies, metric);

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-bold text-gray-800">
        {METRIC_LABELS[metric]} YoY 성장률 추이
      </h2>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">
          ※ 전년 동기 대비 성장률(%) — 통화 무관 비교 가능
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value, name) => {
                const company = COMPANIES[name as CompanyId];
                return [formatPercent(value as number | null), company?.nameKo || name];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) => {
                const company = COMPANIES[value as CompanyId];
                return company?.nameKo || value;
              }}
            />
            <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
            {COMPANY_IDS.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={COMPANIES[id].color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
