'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { NandCustomerData, NandCustomerId } from '@/types/nand-customer';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS, NandMetricKey } from '@/lib/nand-constants';
import { formatCurrency } from '@/lib/format';

interface NandCapexChartProps {
  customers: Record<NandCustomerId, NandCustomerData>;
  onSelectMetric?: (key: NandMetricKey) => void;
}

type CurrencyMode = 'original' | 'krw';

export default function NandCapexChart({ customers, onSelectMetric }: NandCapexChartProps) {
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarterSet = new Set<string>();
  NAND_CUSTOMER_IDS.forEach((id) => {
    customers[id].nandMetrics.forEach((m) => quarterSet.add(m.quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number> = { quarter };
    NAND_CUSTOMER_IDS.forEach((id) => {
      const m = customers[id].nandMetrics.find((nm) => nm.quarter === quarter);
      if (currencyMode === 'krw') {
        point[id] = m ? m.capexKRW : 0;
      } else {
        point[id] = m ? m.capex : 0;
      }
    });
    return point;
  });

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('capex')}
        >설비투자(Capex) 비교</h2>
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
        <p className="mb-2 text-xs text-gray-400">※ 분기별 설비투자 금액</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
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
                const abs = Math.abs(v);
                if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                if (abs >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                return String(v);
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                const companyId = name as NandCustomerId;
                const customer = NAND_CUSTOMERS[companyId];
                const currency = currencyMode === 'krw' ? 'KRW' : customer.currency;
                return [formatCurrency(Number(value), currency), customer.nameKo];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) => {
                const customer = NAND_CUSTOMERS[value as NandCustomerId];
                return customer?.nameKo || value;
              }}
            />
            {NAND_CUSTOMER_IDS.map((id) => (
              <Bar
                key={id}
                dataKey={id}
                fill={NAND_CUSTOMERS[id].color}
                radius={[2, 2, 0, 0]}
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
