'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProductMixItem } from '@/types/v2';

interface Props {
  data: ProductMixItem[];
}

export default function ProductMixChart({ data }: Props) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            dataKey="percentage"
            nameKey="category"
          >
            {data.map((item, i) => (
              <Cell key={i} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) => [value != null ? `${value}%` : '-', '']}
            contentStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600">
              {item.category} {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
