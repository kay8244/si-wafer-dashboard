import { NextRequest, NextResponse } from 'next/server';
import type { MetricRow } from '@/lib/db';
import { queryByCustomer, queryMetrics, parseMeta } from '@/lib/db';
import type {
  CustomerExecutive,
  CustomerDetailId,
  MonthlyMetricData,
  ConfigurableKpi,
  KpiMetric,
  ProductMixItem,
  ProductMixTrend,
  WaferInputData,
  WaferInOutQuarterlyEntry,
  BitGrowthQuarterlyEntry,
  EstimateTrendData,
  EstimateTrendPoint,
  ScrapRate,
  ExternalComparison,
  CustomerNews,
  WeeklySummary,
  NewsCategory,
  CustomerMetricId,
  IndustryMetric,
} from '@/types/indicators';

async function queryCustomerList(): Promise<{ id: string; label: string; type: string; subLabel?: string }[]> {
  try {
    const rows = await queryMetrics('customer-detail', { category: 'customerList' });
    return rows.map((r) => {
      let meta: { label?: string; type?: string; subLabel?: string } = {};
      try { meta = JSON.parse(r.metadata ?? '{}'); } catch { /* ignore */ }
      return {
        id: r.customer,
        label: meta.label ?? r.customer,
        type: meta.type ?? 'memory',
        ...(meta.subLabel ? { subLabel: meta.subLabel } : {}),
      };
    });
  } catch {
    return [];
  }
}

// Compare month strings in 'YY.MM' format
function compareMonths(a: string, b: string): number {
  // 'YY.MM' e.g. '23.03' — simple lexicographic sort works for same-century years
  return a.localeCompare(b);
}

function buildCustomerExecutive(customerId: string, rows: MetricRow[]): CustomerExecutive | null {
  // ── customerMeta ──────────────────────────────────────────────────────────
  const metaRow = rows.find((r) => r.category === 'customerMeta');
  if (!metaRow) return null;

  const metaMeta = parseMeta<{
    label?: string;
    type?: 'memory' | 'foundry';
    newsQueryKo?: string;
    newsQueryEn?: string;
    versionLabel?: string;
    prevVersionLabel?: string;
    foundryData?: string;
    mktInfo?: string;
  }>(metaRow);

  const label = metaMeta.label ?? customerId;
  const type = metaMeta.type ?? 'memory';

  // ── kpiMetrics ────────────────────────────────────────────────────────────
  // category = 'kpiMetric_{index}' or 'kpiMetric', customer=customerId, version=label, unit=unit, value=numeric, metadata={label,value,unit}
  const kpiRows = rows.filter((r) => r.category.startsWith('kpiMetric_') || r.category === 'kpiMetric');
  const kpiMetrics: KpiMetric[] = kpiRows.map((r) => {
    const meta = parseMeta<{ label?: string; value?: string; unit?: string }>(r);
    return {
      label: meta.label ?? r.version ?? '',
      value: meta.value ?? String(r.value ?? ''),
      ...(meta.unit || r.unit ? { unit: meta.unit ?? r.unit ?? undefined } : {}),
    };
  });

  // ── configurableKpis ──────────────────────────────────────────────────────
  // category='configurableKpi_{metricId}', metadata={id,label,value,unit,trend,trendValue}
  const configurableKpiRows = rows.filter((r) => r.category.startsWith('configurableKpi_'));
  const configurableKpis: ConfigurableKpi[] = configurableKpiRows.map((r) => {
    const meta = parseMeta<{
      id?: string;
      label?: string;
      value?: string;
      unit?: string;
      trend?: 'up' | 'down' | 'flat';
      trendValue?: string;
    }>(r);
    const id = meta.id ?? r.category.replace('configurableKpi_', '') as CustomerMetricId;
    return {
      id: id as CustomerMetricId,
      label: meta.label ?? id,
      value: meta.value ?? String(r.value ?? ''),
      unit: meta.unit ?? r.unit ?? '',
      trend: meta.trend ?? 'flat',
      trendValue: meta.trendValue ?? '0.0%',
    };
  });

  // ── productMix ────────────────────────────────────────────────────────────
  // category='productMix_{category}', value=percentage, version=color, metadata={category,color}
  const productMixRows = rows.filter((r) => r.category.startsWith('productMix_') && !r.category.includes('Trend'));
  const productMix: ProductMixItem[] = productMixRows.map((r) => {
    const meta = parseMeta<{ category?: string; color?: string }>(r);
    return {
      category: meta.category ?? r.category.replace('productMix_', ''),
      percentage: r.value ?? 0,
      color: meta.color ?? r.version ?? '#64748b',
    };
  });

  // ── productMixTrend ───────────────────────────────────────────────────────
  // category='productMixTrend_{category}', date=quarter, value=percentage
  const productMixTrendRows = rows.filter((r) => r.category.startsWith('productMixTrend_'));
  // Group by quarter (date), collect values per category
  const trendQuarterMap: Record<string, Record<string, number>> = {};
  const trendQuarterOrder: string[] = [];
  for (const r of productMixTrendRows) {
    const cat = r.category.replace('productMixTrend_', '');
    const quarter = r.date;
    if (!trendQuarterMap[quarter]) {
      trendQuarterMap[quarter] = {};
      trendQuarterOrder.push(quarter);
    }
    trendQuarterMap[quarter][cat] = r.value ?? 0;
  }
  // Preserve insertion order (DB order)
  const seenQuarters = new Set<string>();
  const productMixTrend: ProductMixTrend[] = [];
  for (const q of trendQuarterOrder) {
    if (!seenQuarters.has(q)) {
      seenQuarters.add(q);
      productMixTrend.push({ quarter: q, values: trendQuarterMap[q] });
    }
  }

  // ── waferInput ────────────────────────────────────────────────────────────
  // category='waferInput_km2'|'waferInput_km'|'waferInput_kpcs', date=quarter
  const wiKm2Rows = rows.filter((r) => r.category === 'waferInput_km2');
  const wiKmRows = rows.filter((r) => r.category === 'waferInput_km');
  const wiKpcsRows = rows.filter((r) => r.category === 'waferInput_kpcs');
  const wiKm2Map: Record<string, number> = {};
  const wiKmMap: Record<string, number> = {};
  const wiKpcsMap: Record<string, number> = {};
  for (const r of wiKm2Rows) wiKm2Map[r.date] = r.value ?? 0;
  for (const r of wiKmRows) wiKmMap[r.date] = r.value ?? 0;
  for (const r of wiKpcsRows) wiKpcsMap[r.date] = r.value ?? 0;
  // Use km2 rows to define the quarter list (preserve DB order)
  const wiQuartersSeen = new Set<string>();
  const waferInput: WaferInputData[] = [];
  for (const r of wiKm2Rows) {
    if (!wiQuartersSeen.has(r.date)) {
      wiQuartersSeen.add(r.date);
      waferInput.push({
        quarter: r.date,
        km2: wiKm2Map[r.date] ?? 0,
        km: wiKmMap[r.date] ?? 0,
        kpcs: wiKpcsMap[r.date] ?? 0,
      });
    }
  }

  // ── monthlyMetrics ────────────────────────────────────────────────────────
  // category='monthly_{metric}', version='current'|'previous', date='YY.MM'
  // metric keys: waferInput, purchaseVolume, inventoryMonths, utilization, inventoryLevel, capa, dramRatio
  const MONTHLY_FIELDS = ['waferInput', 'purchaseVolume', 'inventoryMonths', 'utilization', 'inventoryLevel', 'capa', 'dramRatio'] as const;
  type MonthlyField = typeof MONTHLY_FIELDS[number];

  function buildMonthlyMetrics(version: 'current' | 'previous'): MonthlyMetricData[] {
    const monthMap: Record<string, Partial<MonthlyMetricData>> = {};
    const monthOrder: string[] = [];
    for (const field of MONTHLY_FIELDS) {
      const fieldRows = rows.filter(
        (r) => r.category === `monthly_${field}` && r.version === version,
      );
      for (const r of fieldRows) {
        const month = r.date;
        if (!monthMap[month]) {
          monthMap[month] = { month };
          monthOrder.push(month);
        }
        (monthMap[month] as Record<string, unknown>)[field] = r.value ?? 0;
      }
    }
    // Deduplicate monthOrder, then sort by 'YY.MM'
    const uniqueMonths = Array.from(new Set(monthOrder)).sort(compareMonths);
    return uniqueMonths.map((m) => {
      const partial = monthMap[m] ?? {};
      return {
        month: m,
        waferInput: (partial.waferInput as number) ?? 0,
        purchaseVolume: (partial.purchaseVolume as number) ?? 0,
        inventoryMonths: (partial.inventoryMonths as number) ?? 0,
        utilization: (partial.utilization as number) ?? 0,
        inventoryLevel: (partial.inventoryLevel as number) ?? 0,
        capa: (partial.capa as number) ?? 0,
        ...(partial.dramRatio !== undefined ? { dramRatio: partial.dramRatio as number } : {}),
      };
    });
  }

  const monthlyMetrics = buildMonthlyMetrics('current');
  const monthlyMetricsPrevRaw = buildMonthlyMetrics('previous');
  const monthlyMetricsPrev = monthlyMetricsPrevRaw.length > 0 ? monthlyMetricsPrevRaw : undefined;

  // ── waferInOutQuarterly ───────────────────────────────────────────────────
  // category='quarterly_waferIn'|'quarterly_waferOut'|'quarterly_dramRatio', date=quarter
  const wiInRows = rows.filter((r) => r.category === 'quarterly_waferIn');
  const wiOutRows = rows.filter((r) => r.category === 'quarterly_waferOut');
  const wiDramRows = rows.filter((r) => r.category === 'quarterly_dramRatio');
  const wiOutMap: Record<string, number> = {};
  const wiDramMap: Record<string, number | undefined> = {};
  for (const r of wiOutRows) wiOutMap[r.date] = r.value ?? 0;
  for (const r of wiDramRows) wiDramMap[r.date] = r.value ?? undefined;
  const waferInOutQuarterlySeen = new Set<string>();
  const waferInOutQuarterly: WaferInOutQuarterlyEntry[] = [];
  for (const r of wiInRows) {
    if (!waferInOutQuarterlySeen.has(r.date)) {
      waferInOutQuarterlySeen.add(r.date);
      const entry: WaferInOutQuarterlyEntry = {
        quarter: r.date,
        waferIn: r.value ?? 0,
        waferOut: wiOutMap[r.date] ?? 0,
        isEstimate: r.is_estimate === 1,
      };
      if (wiDramMap[r.date] !== undefined) entry.dramRatio = wiDramMap[r.date];
      waferInOutQuarterly.push(entry);
    }
  }

  // ── bitGrowthQuarterly ────────────────────────────────────────────────────
  // category='quarterly_bitGrowth'|'quarterly_bitGrowthTF', date=quarter
  const bgRows = rows.filter((r) => r.category === 'quarterly_bitGrowth');
  const bgTfRows = rows.filter((r) => r.category === 'quarterly_bitGrowthTF');
  const bgTfMap: Record<string, number | undefined> = {};
  for (const r of bgTfRows) bgTfMap[r.date] = r.value ?? undefined;
  const bgSeen = new Set<string>();
  const bitGrowthQuarterly: BitGrowthQuarterlyEntry[] = [];
  for (const r of bgRows) {
    if (!bgSeen.has(r.date)) {
      bgSeen.add(r.date);
      const entry: BitGrowthQuarterlyEntry = {
        quarter: r.date,
        growth: r.value ?? 0,
        isEstimate: r.is_estimate === 1,
      };
      if (bgTfMap[r.date] !== undefined) entry.growthTF = bgTfMap[r.date];
      bitGrowthQuarterly.push(entry);
    }
  }

  // ── estimateTrend ─────────────────────────────────────────────────────────
  // category='estimateTrend_ubs_waferIn'|'_waferOut'|'_bitGrowth' and 'estimateTrend_tf_*'
  // date=reportDate, value=value, metadata={targetYear}
  function buildEstimateTrendPoints(prefix: string): EstimateTrendPoint[] {
    const wiRows = rows.filter((r) => r.category === `${prefix}_waferIn`);
    const woRows = rows.filter((r) => r.category === `${prefix}_waferOut`);
    const bgRowsEst = rows.filter((r) => r.category === `${prefix}_bitGrowth`);
    const drRows = rows.filter((r) => r.category === `${prefix}_dramRatio`);
    const woMap: Record<string, number> = {};
    const bgMap: Record<string, number> = {};
    const drMap: Record<string, number> = {};
    for (const r of woRows) woMap[r.date] = r.value ?? 0;
    for (const r of bgRowsEst) bgMap[r.date] = r.value ?? 0;
    for (const r of drRows) drMap[r.date] = r.value ?? 0;
    return wiRows.map((r) => ({
      reportDate: r.date,
      waferIn: r.value ?? 0,
      waferOut: woMap[r.date] ?? 0,
      bitGrowth: bgMap[r.date] ?? 0,
      ...(drMap[r.date] !== undefined ? { dramRatio: drMap[r.date] } : {}),
    }));
  }

  const ubsPoints = buildEstimateTrendPoints('estimateTrend_ubs');
  const tfPoints = buildEstimateTrendPoints('estimateTrend_tf');

  let estimateTrend: EstimateTrendData | undefined;
  if (ubsPoints.length > 0 || tfPoints.length > 0) {
    // targetYear from first row's metadata
    const etRow = rows.find((r) => r.category.startsWith('estimateTrend_'));
    const etMeta = etRow ? parseMeta<{ targetYear?: number }>(etRow) : {};
    estimateTrend = {
      targetYear: etMeta.targetYear ?? 2026,
      ubs: ubsPoints,
      trendforce: tfPoints,
    };
  }

  // ── scrapRate ─────────────────────────────────────────────────────────────
  // category='scrapRate_{label}', metadata={label}, value_internal via unit='internal', value=internal
  // OR: two rows per label — version='internal'|'external'
  const scrapRows = rows.filter((r) => r.category.startsWith('scrapRate_'));
  const scrapLabelMap: Record<string, { label: string; internal: number; external: number }> = {};
  for (const r of scrapRows) {
    const meta = parseMeta<{ label?: string; internal?: number; external?: number }>(r);
    const label = meta.label ?? r.category.replace('scrapRate_', '');
    if (!scrapLabelMap[label]) scrapLabelMap[label] = { label, internal: 0, external: 0 };
    if (meta.internal !== undefined) scrapLabelMap[label].internal = meta.internal;
    if (meta.external !== undefined) scrapLabelMap[label].external = meta.external;
    // Fallback: version field indicates internal/external
    if (r.version === 'internal') scrapLabelMap[label].internal = r.value ?? 0;
    if (r.version === 'external') scrapLabelMap[label].external = r.value ?? 0;
  }
  const scrapRate: ScrapRate[] = Object.values(scrapLabelMap);

  // ── externalComparison ────────────────────────────────────────────────────
  // category='externalComparison_{source}', metadata={source,waferBitOut,bitGrowth,gap}
  const extRows = rows.filter((r) => r.category.startsWith('externalComparison_'));
  const externalComparison: ExternalComparison[] = extRows.map((r) => {
    const meta = parseMeta<{ source?: string; waferBitOut?: string; bitGrowth?: string; gap?: string }>(r);
    return {
      source: meta.source ?? r.customer,
      waferBitOut: meta.waferBitOut ?? '-',
      bitGrowth: meta.bitGrowth ?? '-',
      gap: meta.gap ?? '-',
    };
  });

  // ── news ──────────────────────────────────────────────────────────────────
  // category='news', date=date, version=source, metadata={title, categories}
  const newsRows = rows.filter((r) => r.category === 'news');
  const news: CustomerNews[] = newsRows.map((r) => {
    const meta = parseMeta<{ title?: string; categories?: NewsCategory[] }>(r);
    return {
      source: r.version ?? '',
      date: r.date,
      title: meta.title ?? '',
      ...(meta.categories && meta.categories.length > 0 ? { categories: meta.categories } : {}),
    };
  });

  // ── weeklySummary ─────────────────────────────────────────────────────────
  // category='weeklySummary', version=weekLabel, metadata={comment}
  const wSumRow = rows.find((r) => r.category === 'weeklySummary');
  const weeklySummary: WeeklySummary = wSumRow
    ? {
        weekLabel: wSumRow.version ?? '',
        comment: parseMeta<{ comment?: string }>(wSumRow).comment ?? '',
      }
    : { weekLabel: '', comment: '' };

  // ── financials ────────────────────────────────────────────────────────────
  // category='financial_revenue'|'financial_operatingIncome', date=quarter (e.g. '4Q21')
  const finRevRows = rows.filter((r) => r.category === 'financial_revenue');
  const finOiMap: Record<string, number> = {};
  for (const r of rows.filter((r) => r.category === 'financial_operatingIncome')) {
    finOiMap[r.date] = r.value ?? 0;
  }
  const finSeen = new Set<string>();
  const financials: { quarter: string; revenue: number; operatingIncome: number }[] = [];
  for (const r of finRevRows) {
    if (!finSeen.has(r.date)) {
      finSeen.add(r.date);
      financials.push({
        quarter: r.date,
        revenue: r.value ?? 0,
        operatingIncome: finOiMap[r.date] ?? 0,
      });
    }
  }

  // ── transcript ────────────────────────────────────────────────────────────
  // category='transcript', date=quarter (e.g. '4Q24'), metadata={summary,excelUrl,pdfUrl}
  const transcriptRow = rows.find((r) => r.category === 'transcript');
  const transcript = transcriptRow
    ? (() => {
        const meta = parseMeta<{ summary?: string; excelUrl?: string; pdfUrl?: string }>(transcriptRow);
        return {
          quarter: transcriptRow.date,
          summary: meta.summary ?? '',
          excelUrl: meta.excelUrl ?? '',
          pdfUrl: meta.pdfUrl ?? '',
        };
      })()
    : undefined;

  // ── industryMetrics ───────────────────────────────────────────────────────
  // category='industry_metric', metadata={metricId, name, tooltip?, period}
  // Group rows by metricId, accumulate data points
  const industryMetricRows = rows.filter((r) => r.category === 'industry_metric');
  const industryMetricMap: Record<string, {
    id: string; name: string; tooltip?: string; unit: string; period: 'monthly' | 'quarterly';
    data: { date: string; value: number }[];
  }> = {};
  const industryMetricOrder: string[] = [];
  for (const r of industryMetricRows) {
    const meta = parseMeta<{ metricId?: string; name?: string; tooltip?: string; period?: string }>(r);
    const metricId = meta.metricId ?? 'unknown';
    if (!industryMetricMap[metricId]) {
      industryMetricMap[metricId] = {
        id: metricId,
        name: meta.name ?? metricId,
        ...(meta.tooltip ? { tooltip: meta.tooltip } : {}),
        unit: r.unit ?? '',
        period: (meta.period === 'quarterly' ? 'quarterly' : 'monthly') as 'monthly' | 'quarterly',
        data: [],
      };
      industryMetricOrder.push(metricId);
    }
    industryMetricMap[metricId].data.push({ date: r.date, value: r.value ?? 0 });
  }
  const industryMetrics: IndustryMetric[] = industryMetricOrder.map((id) => industryMetricMap[id]);

  // ── Assemble CustomerExecutive ─────────────────────────────────────────────
  const exec: CustomerExecutive = {
    customerId: customerId as CustomerDetailId,
    label,
    type,
    productMix,
    kpiMetrics,
    configurableKpis,
    productMixTrend,
    waferInput,
    monthlyMetrics,
    ...(monthlyMetricsPrev !== undefined ? { monthlyMetricsPrev } : {}),
    ...(metaMeta.versionLabel ? { versionLabel: metaMeta.versionLabel } : {}),
    ...(metaMeta.prevVersionLabel ? { prevVersionLabel: metaMeta.prevVersionLabel } : {}),
    scrapRate,
    externalComparison,
    news,
    weeklySummary,
    waferInOutQuarterly,
    bitGrowthQuarterly,
    ...(estimateTrend ? { estimateTrend } : {}),
    ...(metaMeta.foundryData ? { foundryData: metaMeta.foundryData } : {}),
    ...(metaMeta.mktInfo ? { mktInfo: metaMeta.mktInfo } : {}),
    ...(metaMeta.newsQueryKo ? { newsQueryKo: metaMeta.newsQueryKo } : {}),
    ...(metaMeta.newsQueryEn ? { newsQueryEn: metaMeta.newsQueryEn } : {}),
    ...(financials.length > 0 ? { financials } : {}),
    ...(transcript ? { transcript } : {}),
    ...(industryMetrics.length > 0 ? { industryMetrics } : {}),
  };

  return exec;
}

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
  const customerParam = searchParams.get('customer');

  // Customer list
  const customerList = await queryCustomerList();

  if (customerParam) {
    // Single customer
    const rows = await queryByCustomer('customer-detail', customerParam);
    if (rows.length === 0) {
      return NextResponse.json({ customerList, customers: {} });
    }
    const exec = buildCustomerExecutive(customerParam, rows);
    if (!exec) {
      return NextResponse.json({ customerList, customers: {} });
    }
    return NextResponse.json({
      customerList,
      customers: { [customerParam]: exec },
    });
  }

  // All customers — group rows by customer
  const allRows = await queryByCustomer('customer-detail');
  const rowsByCustomer: Record<string, MetricRow[]> = {};
  for (const row of allRows) {
    // Skip customerList rows (they don't belong to a specific customer)
    if (row.category === 'customerList') continue;
    if (!rowsByCustomer[row.customer]) rowsByCustomer[row.customer] = [];
    rowsByCustomer[row.customer].push(row);
  }

  const customers: Record<string, CustomerExecutive> = {};
  for (const [customerId, rows] of Object.entries(rowsByCustomer)) {
    const exec = buildCustomerExecutive(customerId, rows);
    if (exec) customers[customerId] = exec;
  }

  return NextResponse.json({ customerList, customers });
  } catch (err) {
    console.error('[customer-detail] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
