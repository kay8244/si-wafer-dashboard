'use client';

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { FoundryCustomerData, FoundryCustomerId } from '@/types/foundry-customer';
import { FOUNDRY_CUSTOMERS, FOUNDRY_CUSTOMER_IDS, FoundryMetricKey } from '@/lib/foundry-constants';
import { formatPercent } from '@/lib/format';

interface FoundryMetricsChartProps {
  customers: Record<FoundryCustomerId, FoundryCustomerData>;
  onSelectMetric?: (key: FoundryMetricKey) => void;
}

function buildMetricData(
  customers: Record<FoundryCustomerId, FoundryCustomerData>,
  metricKey: string
): Record<string, string | number | null>[] {
  const quarterSet = new Set<string>();
  FOUNDRY_CUSTOMER_IDS.forEach((id) => {
    customers[id].foundryMetrics.forEach((m) => quarterSet.add(m.quarter));
  });
  const quarters = Array.from(quarterSet).sort().slice(-8);

  return quarters.map((quarter) => {
    const point: Record<string, string | number | null> = { quarter };
    FOUNDRY_CUSTOMER_IDS.forEach((id) => {
      const m = customers[id].foundryMetrics.find((fm) => fm.quarter === quarter);
      point[id] = m ? (m[metricKey as keyof typeof m] as number | null) : null;
    });
    return point;
  });
}

function ChartTooltipFormatter(value: unknown, name: string | undefined) {
  const customer = FOUNDRY_CUSTOMERS[(name ?? '') as FoundryCustomerId];
  return [formatPercent(value as number | null), customer?.nameKo || name || ''];
}

function ChartLegendFormatter(value: string) {
  const customer = FOUNDRY_CUSTOMERS[value as FoundryCustomerId];
  return customer?.nameKo || value;
}

export default function FoundryMetricsChart({ customers, onSelectMetric }: FoundryMetricsChartProps) {
  const waferAspData = buildMetricData(customers, 'waferAspChangeQoQ');
  const waferShipmentData = buildMetricData(customers, 'waferShipmentGrowthQoQ');
  const advancedNodeData = buildMetricData(customers, 'advancedNodeRatio');
  const utilData = buildMetricData(customers, 'utilizationRate');
  const invData = buildMetricData(customers, 'inventoryDays');

  return (
    <div className="space-y-10">
      {/* Wafer ASP Change QoQ */}
      <section>
        <h2
          className="mb-5 cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
          onClick={() => onSelectMetric?.('waferAsp')}
        >
          웨이퍼 ASP 변동률 (QoQ)
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-3 text-xs text-slate-400">※ 분기별 웨이퍼 평균판매가격 변동률(%)</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={waferAspData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={ChartTooltipFormatter} contentStyle={{ fontSize: 12 }} />
              <Legend formatter={ChartLegendFormatter} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
              {FOUNDRY_CUSTOMER_IDS.map((id) => (
                <Bar key={id} dataKey={id} fill={FOUNDRY_CUSTOMERS[id].color} radius={[3, 3, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Wafer Shipment Growth QoQ */}
      <section>
        <h2
          className="mb-5 cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
          onClick={() => onSelectMetric?.('waferShipment')}
        >
          웨이퍼 출하량 성장률 (QoQ)
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-3 text-xs text-slate-400">※ 분기별 웨이퍼 출하량 변동률(%)</p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={waferShipmentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={ChartTooltipFormatter} contentStyle={{ fontSize: 12 }} />
              <Legend formatter={ChartLegendFormatter} />
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
              {FOUNDRY_CUSTOMER_IDS.map((id) => (
                <Bar key={id} dataKey={id} fill={FOUNDRY_CUSTOMERS[id].color} radius={[3, 3, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Advanced Node Ratio */}
      <section>
        <h2
          className="mb-5 cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
          onClick={() => onSelectMetric?.('advancedNode')}
        >
          첨단 노드 비중 추이
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-3 text-xs text-slate-400">※ 매출 대비 첨단 공정(7nm 이하) 비중(%)</p>
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={advancedNodeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                formatter={(value, name) => {
                  const customer = FOUNDRY_CUSTOMERS[name as FoundryCustomerId];
                  const v = value as number | null;
                  return [v != null ? `${v}%` : 'N/A', customer?.nameKo || name];
                }}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend formatter={ChartLegendFormatter} />
              {FOUNDRY_CUSTOMER_IDS.map((id) => (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={FOUNDRY_CUSTOMERS[id].color}
                  fill={FOUNDRY_CUSTOMERS[id].color}
                  fillOpacity={0.12}
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Utilization Rate & Inventory Days side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2
            className="mb-5 cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
            onClick={() => onSelectMetric?.('utilization')}
          >
            가동률 추이
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-3 text-xs text-slate-400">※ 생산설비 가동률(%)</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={utilData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[50, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  formatter={(value, name) => {
                    const customer = FOUNDRY_CUSTOMERS[name as FoundryCustomerId];
                    const v = value as number | null;
                    return [v != null ? `${v}%` : 'N/A', customer?.nameKo || name];
                  }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend formatter={ChartLegendFormatter} />
                {FOUNDRY_CUSTOMER_IDS.map((id) => (
                  <Line key={id} type="monotone" dataKey={id} stroke={FOUNDRY_CUSTOMERS[id].color} strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2
            className="mb-5 cursor-pointer text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
            onClick={() => onSelectMetric?.('inventory')}
          >
            재고일수 추이
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-3 text-xs text-slate-400">※ 평균 재고 보유일수</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={invData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v: number) => `${v}일`} />
                <Tooltip
                  formatter={(value, name) => {
                    const customer = FOUNDRY_CUSTOMERS[name as FoundryCustomerId];
                    const v = value as number | null;
                    return [v != null ? `${v}일` : 'N/A', customer?.nameKo || name];
                  }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend formatter={ChartLegendFormatter} />
                {FOUNDRY_CUSTOMER_IDS.map((id) => (
                  <Line key={id} type="monotone" dataKey={id} stroke={FOUNDRY_CUSTOMERS[id].color} strokeWidth={2.5} dot={{ r: 5 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
