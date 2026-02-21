'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CustomerExecutive } from '@/types/v2';
import ProductMixChart from './ProductMixChart';
import WaferInputChart from './WaferInputChart';

interface Props {
  data: CustomerExecutive;
}

export default function ExecutivePanel({ data }: Props) {
  // Build stacked area data from productMixTrend
  const categories = data.productMix.map((p) => p.category);
  const trendData = data.productMixTrend.map((t) => ({
    quarter: t.quarter,
    ...t.values,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Executive 현황판 card */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Executive 현황판</h3>

        {/* Product Mix donut */}
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Product Mix</p>
          <ProductMixChart data={data.productMix} />
        </div>

        {/* KPI metrics */}
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-gray-500">개방선인 수/주 Silicon 자원</p>
          <div className="flex gap-3">
            {data.kpiMetrics.map((kpi, i) => (
              <div
                key={i}
                className="flex-1 rounded-md bg-gray-50 p-2 text-center"
              >
                <div className="text-xl font-bold leading-tight text-gray-900">
                  {kpi.value}
                  {kpi.unit && (
                    <span className="ml-0.5 text-sm font-normal text-gray-500">
                      {kpi.unit}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{kpi.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Product mix trend stacked area */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Product Mix 추이</p>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <XAxis dataKey="quarter" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              {categories.map((cat, i) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={data.productMix[i]?.color ?? '#ccc'}
                  fill={data.productMix[i]?.color ?? '#ccc'}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wafer Input chart */}
      <WaferInputChart data={data.waferInput} />

      {/* Scrap Rate */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-800">공폐율 (Scrap Rate)</h3>
        <div className="space-y-2">
          {data.scrapRate.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{s.label}</span>
              <div className="flex gap-3">
                <span className="text-gray-700">
                  내부: <span className="font-semibold text-blue-700">{s.internal}%</span>
                </span>
                <span className="text-gray-700">
                  외부: <span className="font-semibold text-orange-600">{s.external}%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
