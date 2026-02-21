'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DRAM_FINANCIAL_METRICS } from '@/lib/customer-constants';
import { formatCurrency } from '@/lib/format';

interface DramFinancialChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
}

type FinancialMetricKey = 'revenue' | 'operatingIncome' | 'netIncome' | 'ebitda';
type CurrencyMode = 'original' | 'krw';

const KRW_MAP: Record<FinancialMetricKey, string> = {
  revenue: 'revenueKRW',
  operatingIncome: 'operatingIncomeKRW',
  netIncome: 'netIncomeKRW',
  ebitda: 'ebitdaKRW',
};

export default function DramFinancialChart({ customers }: DramFinancialChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<FinancialMetricKey>('revenue');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('krw');

  const quarterSet = new Set<string>();
  DRAM_CUSTOMER_IDS.forEach((id) => {
    customers[id].segmentFinancials.forEach((q) => quarterSet.add(q.quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  const data = quarters.map((quarter) => {
    const point: Record<string, string | number> = { quarter };
    DRAM_CUSTOMER_IDS.forEach((id) => {
      const q = customers[id].segmentFinancials.find((f) => f.quarter === quarter);
      if (currencyMode === 'krw') {
        const krwKey = KRW_MAP[selectedMetric] as keyof typeof q;
        point[id] = q ? (q[krwKey] as number) : 0;
      } else {
        point[id] = q ? (q[selectedMetric as keyof typeof q] as number) : 0;
      }
    });
    return point;
  });

  const metricLabel = DRAM_FINANCIAL_METRICS.find((m) => m.key === selectedMetric)?.labelKo || selectedMetric;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">
          분기별 {metricLabel} 비교 (세그먼트)
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {DRAM_FINANCIAL_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key as FinancialMetricKey)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {m.labelKo}
              </button>
            ))}
          </div>
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
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ResponsiveContainer width="100%" height={450}>
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
                if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
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
        <p className="mt-3 text-xs text-slate-400">
          {currencyMode === 'krw'
            ? '※ 마이크론은 USD→KRW 환산 기준'
            : '※ 삼성DS·SK하이닉스: KRW / 마이크론: USD'}
        </p>
      </div>
    </section>
  );
}
