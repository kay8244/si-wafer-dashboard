'use client';

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { CustomerInfo, collectQuarters } from '@/lib/chart-utils';
import { formatPercent } from '@/lib/format';

export interface MetricsSection {
  metricKey: string;
  selectKey: string;
  title: string;
  description: string;
  chartType: 'bar' | 'area' | 'line';
  unit: string;
  height?: number;
  yDomain?: [number, number];
}

interface GenericMetricsChartProps {
  customerIds: string[];
  customers: Record<string, { metrics: unknown[] }>;
  customerInfo: Record<string, CustomerInfo>;
  sections: MetricsSection[];
  onSelectMetric?: (key: string) => void;
}

function buildMetricData(
  customerIds: string[],
  customers: Record<string, { metrics: unknown[] }>,
  metricKey: string,
): Record<string, string | number | null>[] {
  const quarters = collectQuarters(
    customerIds,
    (id) => customers[id].metrics as { quarter: string }[],
  );
  return quarters.map((quarter) => {
    const point: Record<string, string | number | null> = { quarter };
    customerIds.forEach((id) => {
      const m = (customers[id].metrics as Record<string, unknown>[]).find(
        (dm) => (dm as { quarter: string }).quarter === quarter,
      ) as Record<string, unknown> | undefined;
      point[id] = m ? (m[metricKey] as number | null) : null;
    });
    return point;
  });
}

function PercentTooltipFormatter(
  customerInfo: Record<string, CustomerInfo>,
  unit: string,
) {
  return (value: unknown, name: string | undefined) => {
    const info = customerInfo[(name ?? '') as string];
    const v = value as number | null;
    if (unit === '%') return [v != null ? `${v}%` : 'N/A', info?.nameKo || name || ''];
    if (unit === '일') return [v != null ? `${v}일` : 'N/A', info?.nameKo || name || ''];
    return [formatPercent(v), info?.nameKo || name || ''];
  };
}

function renderSection(
  section: MetricsSection,
  customerIds: string[],
  customers: Record<string, { metrics: unknown[] }>,
  customerInfo: Record<string, CustomerInfo>,
  onSelectMetric?: (key: string) => void,
) {
  const chartData = buildMetricData(customerIds, customers, section.metricKey);
  const height = section.height || 300;
  const tooltipFormatter = PercentTooltipFormatter(customerInfo, section.unit);
  const legendFormatter = (value: string) => customerInfo[value]?.nameKo || value;
  const yFormatter = (v: number) => {
    if (section.unit === '%') return `${v}%`;
    if (section.unit === '일') return `${v}일`;
    return String(v);
  };

  const commonChartProps = { data: chartData, margin: { top: 20, right: 30, left: 20, bottom: 5 } };
  const smallMargin = { top: 20, right: 20, left: 10, bottom: 5 };

  return (
    <section key={section.selectKey}>
      <h2
        className="mb-4 text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={() => onSelectMetric?.(section.selectKey)}
      >{section.title}</h2>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-400">※ {section.description}</p>
        <ResponsiveContainer width="100%" height={height}>
          {section.chartType === 'bar' ? (
            <BarChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={yFormatter} domain={section.yDomain} />
              <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 13 }} />
              <Legend formatter={legendFormatter} />
              <ReferenceLine y={0} stroke="#ccc" strokeDasharray="3 3" />
              {customerIds.map((id) => (
                <Bar key={id} dataKey={id} fill={customerInfo[id].color} radius={[2, 2, 0, 0]} maxBarSize={40} />
              ))}
            </BarChart>
          ) : section.chartType === 'area' ? (
            <AreaChart {...commonChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={yFormatter} domain={section.yDomain} />
              <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 13 }} />
              <Legend formatter={legendFormatter} />
              {customerIds.map((id) => (
                <Area key={id} type="monotone" dataKey={id} stroke={customerInfo[id].color} fill={customerInfo[id].color} fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={smallMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={yFormatter} domain={section.yDomain} />
              <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 13 }} />
              <Legend formatter={legendFormatter} />
              {customerIds.map((id) => (
                <Line key={id} type="monotone" dataKey={id} stroke={customerInfo[id].color} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default function GenericMetricsChart({
  customerIds, customers, customerInfo, sections, onSelectMetric,
}: GenericMetricsChartProps) {
  // Split sections: main sections and side-by-side pair (last two if both are 'line' type)
  const mainSections = sections.filter((_, i) => i < sections.length - 2 || sections.length <= 2);
  const sideBySide = sections.length > 2 ? sections.slice(-2) : [];
  const useSideBySide = sideBySide.length === 2 && sideBySide.every((s) => s.chartType === 'line');

  return (
    <div className="space-y-8">
      {(useSideBySide ? mainSections : sections).map((s) =>
        renderSection(s, customerIds, customers, customerInfo, onSelectMetric),
      )}
      {useSideBySide && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sideBySide.map((s) => {
            const overridden = { ...s, height: 280 };
            return renderSection(overridden, customerIds, customers, customerInfo, onSelectMetric);
          })}
        </div>
      )}
    </div>
  );
}
