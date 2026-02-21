'use client';

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { DramCustomerData, DramCustomerId } from '@/types/customer';
import { DRAM_CUSTOMERS, DRAM_CUSTOMER_IDS, DramMetricKey } from '@/lib/customer-constants';
import { formatPercent } from '@/lib/format';

interface DramMetricsChartProps {
  customers: Record<DramCustomerId, DramCustomerData>;
  onSelectMetric?: (key: DramMetricKey) => void;
}

function buildMetricData(
  customers: Record<DramCustomerId, DramCustomerData>,
  metricKey: string
): Record<string, string | number | null>[] {
  const quarterSet = new Set<string>();
  DRAM_CUSTOMER_IDS.forEach((id) => {
    customers[id].dramMetrics.forEach((m) => quarterSet.add(m.quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  return quarters.map((quarter) => {
    const point: Record<string, string | number | null> = { quarter };
    DRAM_CUSTOMER_IDS.forEach((id) => {
      const m = customers[id].dramMetrics.find((dm) => dm.quarter === quarter);
      point[id] = m ? (m[metricKey as keyof typeof m] as number | null) : null;
    });
    return point;
  });
}

function ChartTooltipFormatter(value: unknown, name: string | undefined) {
  const customer = DRAM_CUSTOMERS[(name ?? '') as DramCustomerId];
  return [formatPercent(value as number | null), customer?.nameKo || name || ''];
}

function ChartLegendFormatter(value: string) {
  const customer = DRAM_CUSTOMERS[value as DramCustomerId];
  return customer?.nameKo || value;
}

const tooltipStyle = { fontSize: 12, borderRadius: '8px', border: '1px solid #e2e8f0' };

export default function DramMetricsChart({ customers, onSelectMetric }: DramMetricsChartProps) {
  const aspData = buildMetricData(customers, 'aspChangeQoQ');
  const bitData = buildMetricData(customers, 'bitShipmentGrowthQoQ');
  const hbmData = buildMetricData(customers, 'hbmRatio');
  const utilData = buildMetricData(customers, 'utilizationRate');
  const invData = buildMetricData(customers, 'inventoryDays');

  return (
    <div className="space-y-10">
      {/* ASP Change QoQ */}
      <section>
        <h2
          className="mb-5 text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('asp')}
        >
          DRAM ASP 변동률 (QoQ)
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={aspData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={ChartTooltipFormatter} contentStyle={tooltipStyle} />
              <Legend formatter={ChartLegendFormatter} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
              {DRAM_CUSTOMER_IDS.map((id) => (
                <Bar key={id} dataKey={id} fill={DRAM_CUSTOMERS[id].color} radius={[3, 3, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-400">※ 분기별 평균판매가격 변동률(%)</p>
        </div>
      </section>

      {/* Bit Shipment Growth QoQ */}
      <section>
        <h2
          className="mb-5 text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('bitShipment')}
        >
          Bit 출하량 성장률 (QoQ)
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={bitData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={ChartTooltipFormatter} contentStyle={tooltipStyle} />
              <Legend formatter={ChartLegendFormatter} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
              {DRAM_CUSTOMER_IDS.map((id) => (
                <Bar key={id} dataKey={id} fill={DRAM_CUSTOMERS[id].color} radius={[3, 3, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-400">※ 분기별 비트 출하량 변동률(%)</p>
        </div>
      </section>

      {/* HBM Revenue Ratio */}
      <section>
        <h2
          className="mb-5 text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => onSelectMetric?.('hbm')}
        >
          HBM 매출 비중 추이
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={hbmData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                formatter={(value, name) => {
                  const customer = DRAM_CUSTOMERS[name as DramCustomerId];
                  const v = value as number | null;
                  return [v != null ? `${v}%` : 'N/A', customer?.nameKo || name];
                }}
                contentStyle={tooltipStyle}
              />
              <Legend formatter={ChartLegendFormatter} />
              {DRAM_CUSTOMER_IDS.map((id) => (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={DRAM_CUSTOMERS[id].color}
                  fill={DRAM_CUSTOMERS[id].color}
                  fillOpacity={0.12}
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-slate-400">※ DRAM 매출 대비 HBM 매출 비중(%)</p>
        </div>
      </section>

      {/* Utilization Rate & Inventory Days side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2
            className="mb-5 text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onSelectMetric?.('utilization')}
          >
            가동률 추이
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={utilData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[50, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(value, name) => {
                    const customer = DRAM_CUSTOMERS[name as DramCustomerId];
                    const v = value as number | null;
                    return [v != null ? `${v}%` : 'N/A', customer?.nameKo || name];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={ChartLegendFormatter} />
                {DRAM_CUSTOMER_IDS.map((id) => (
                  <Line key={id} type="monotone" dataKey={id} stroke={DRAM_CUSTOMERS[id].color} strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-slate-400">※ 생산설비 가동률(%)</p>
          </div>
        </section>

        <section>
          <h2
            className="mb-5 text-lg font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onSelectMetric?.('inventory')}
          >
            재고일수 추이
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={invData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}일`} />
                <Tooltip
                  formatter={(value, name) => {
                    const customer = DRAM_CUSTOMERS[name as DramCustomerId];
                    const v = value as number | null;
                    return [v != null ? `${v}일` : 'N/A', customer?.nameKo || name];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend formatter={ChartLegendFormatter} />
                {DRAM_CUSTOMER_IDS.map((id) => (
                  <Line key={id} type="monotone" dataKey={id} stroke={DRAM_CUSTOMERS[id].color} strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-slate-400">※ 평균 재고 보유일수</p>
          </div>
        </section>
      </div>
    </div>
  );
}
