'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { MonthlyMetricData } from '@/types/v2';

interface Props {
  data: MonthlyMetricData[];
}

export default function MonthlyMetricsChart({ data }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
        Wafer 투입량 변동 Chart
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'Km²', angle: -90, position: 'insideLeft', fontSize: 11, offset: 10 }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
            formatter={(value?: number, name?: string) => {
              return [value != null ? `${value} Km²` : '-', name ?? ''];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="waferInput"
            name="투입량"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6' }}
          />
          <Line
            type="monotone"
            dataKey="purchaseVolume"
            name="구매량"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10B981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
