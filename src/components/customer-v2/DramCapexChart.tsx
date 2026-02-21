'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';
import { formatCurrency } from '@/lib/format';

interface DramCapexChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

type CurrencyMode = 'original' | 'krw';

export default function DramCapexChart({ customers, onSelectMetric }: DramCapexChartProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarterSet = new Set<string>();
  DRAM_CUSTOMER_IDS.forEach((id) => {
    customers[id].dramMetrics.forEach((m) => quarterSet.add(m.quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number> = { quarter };
    DRAM_CUSTOMER_IDS.forEach((id) => {
      const m = customers[id].dramMetrics.find((dm) => dm.quarter === quarter);
      if (currencyMode === 'krw') {
        point[id] = m ? m.capexKRW : 0;
      } else {
        point[id] = m ? m.capex : 0;
      }
    });
    return point;
  });

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2
          className="text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('capex')}
        >
          설비투자(Capex) 비교
        </h2>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setCurrencyMode('krw')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'krw'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            원화(KRW)
          </button>
          <button
            onClick={() => setCurrencyMode('original')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              currencyMode === 'original'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            현지통화
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (currencyMode === 'krw') {
                  const abs = Math.abs(v);
                  if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}조`;
                  if (abs >= 1e8) return `${(v / 1e8).toFixed(0)}억`;
                  return String(v);
                }
                const abs = Math.abs(v);
                if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                if (abs >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                return String(v);
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                const companyId = name as DramCustomerId;
                const customer = DRAM_CUSTOMERS[companyId];
                const currency = currencyMode === 'krw' ? 'KRW' : customer.currency;
                return [formatCurrency(Number(value), currency), customer.nameKo];
              }}
              contentStyle={{ fontSize: 12, borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend
              formatter={(value: string) => {
                const customer = DRAM_CUSTOMERS[value as DramCustomerId];
                return customer?.nameKo || value;
              }}
            />
            {DRAM_CUSTOMER_IDS.map((id) => (
              <Bar
                key={id}
                dataKey={id}
                fill={DRAM_CUSTOMERS[id].color}
                radius={[3, 3, 0, 0]}
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-xs text-slate-400">※ 분기별 설비투자 금액</p>
      </div>
    </section>
  );
}
