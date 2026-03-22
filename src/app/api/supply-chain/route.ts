import { NextResponse } from 'next/server';
import type { MetricRow } from '@/lib/db';
import { queryMetrics, queryMetricsLike, queryMetricsIn } from '@/lib/db';
import type {
  SupplyChainCategory,
  SupplyChainIndicator,
  MonthlyData,
  InternalCompanyData,
  InternalMetricType,
  FoundryNode,
  FoundryCompanyId,
  FoundryNodeMonthly,
} from '@/types/indicators';

export async function GET() {
  const TAB = 'supply-chain';

  // 1. Indicator metadata rows
  const metaRows = await queryMetrics(TAB, { category: 'indicatorMeta' });

  // 2. Monthly data rows (actual / threeMonthMA / twelveMonthMA / mom / yoy)
  const VIEW_MODES: string[] = ['actual', 'threeMonthMA', 'twelveMonthMA', 'mom', 'yoy'];
  const monthlyRows = await queryMetricsIn(TAB, VIEW_MODES);

  // 3. Internal company data
  const internalRows = await queryMetricsLike(TAB, 'internal_');

  // 4. Overlay colors
  const colorRows = await queryMetrics(TAB, { category: 'overlayColor' });

  // ── Reconstruct months list ────────────────────────────────────────────────
  const allMonthsSet = new Set<string>();
  for (const row of monthlyRows) {
    allMonthsSet.add(row.date);
  }
  const months = Array.from(allMonthsSet).sort();
  const tableMonths = months.slice(-12);

  // ── Reconstruct MonthlyData per indicator ─────────────────────────────────
  // monthlyRows: customer = indicatorId, category = viewMode, date = month
  // Group: indicatorId -> { date -> partial MonthlyData }
  const indicatorMonthMap: Record<string, Record<string, Partial<MonthlyData>>> = {};
  for (const row of monthlyRows) {
    const indId = row.customer;
    const mode = row.category as keyof MonthlyData;
    const month = row.date;
    if (!indicatorMonthMap[indId]) indicatorMonthMap[indId] = {};
    if (!indicatorMonthMap[indId][month]) indicatorMonthMap[indId][month] = { month };
    (indicatorMonthMap[indId][month] as Record<string, unknown>)[mode] = row.value ?? 0;
  }

  function buildMonthly(indId: string): MonthlyData[] {
    const monthMap = indicatorMonthMap[indId] ?? {};
    return months.map((m) => {
      const partial = monthMap[m] ?? {};
      return {
        month: m,
        actual: (partial.actual as number) ?? 0,
        threeMonthMA: (partial.threeMonthMA as number) ?? 0,
        twelveMonthMA: (partial.twelveMonthMA as number) ?? 0,
        mom: (partial.mom as number) ?? 0,
        yoy: (partial.yoy as number) ?? 0,
      };
    });
  }

  // ── Reconstruct SupplyChainCategory[] from metadata ───────────────────────
  // metaRows: customer = indicatorId, date = categoryId, metadata = JSON with name/unit/judgment/etc.
  interface MetaPayload {
    name?: string;
    unit?: string;
    judgment?: string;
    leadingRating?: string;
    ratingReason?: string;
    categoryLabel?: string;
    semiAnnualEval?: { half: 'H1' | 'H2'; rating: 'positive' | 'neutral' | 'negative'; value: number };
  }

  // Group by categoryId (stored in metadata JSON, NOT in date field)
  interface MetaPayloadWithCategoryId extends MetaPayload {
    categoryId?: string;
    id?: string;
  }
  const categoryMap: Record<string, { label: string; indicators: Map<string, SupplyChainIndicator> }> = {};
  const categoryOrder: string[] = [];

  for (const row of metaRows) {
    const indicatorName = row.customer;
    let meta: MetaPayloadWithCategoryId = {};
    try {
      meta = JSON.parse(row.metadata ?? '{}') as MetaPayloadWithCategoryId;
    } catch {
      // ignore
    }

    const categoryId = meta.categoryId ?? 'unknown';
    const indicatorId = meta.id ?? indicatorName;

    if (!categoryMap[categoryId]) {
      categoryMap[categoryId] = {
        label: meta.categoryLabel ?? categoryId,
        indicators: new Map(),
      };
      categoryOrder.push(categoryId);
    }

    const indicator: SupplyChainIndicator = {
      id: indicatorId,
      name: meta.name ?? indicatorName,
      unit: meta.unit ?? row.unit ?? '',
      monthly: buildMonthly(indicatorName),
      ...(meta.judgment ? { judgment: meta.judgment } : {}),
      ...(meta.leadingRating ? { leadingRating: meta.leadingRating as SupplyChainIndicator['leadingRating'] } : {}),
      ...(meta.ratingReason ? { ratingReason: meta.ratingReason } : {}),
      ...(meta.semiAnnualEval ? { semiAnnualEval: meta.semiAnnualEval } : {}),
    };
    categoryMap[categoryId].indicators.set(indicatorId, indicator);
  }

  const categories: SupplyChainCategory[] = categoryOrder.map((catId) => ({
    id: catId as SupplyChainCategory['id'],
    label: categoryMap[catId].label,
    indicators: Array.from(categoryMap[catId].indicators.values()),
  }));

  // ── Reconstruct InternalCompanyData ───────────────────────────────────────
  // internalRows: category = 'internal_{metricType}', customer = companyId, date = month
  // version = company name (display)
  const internalCompanyMap: Record<string, {
    id: string;
    name: string;
    metrics: Record<string, { month: string; value: number }[]>;
  }> = {};

  for (const row of internalRows) {
    const companyId = row.customer;
    const metricType = row.category.replace(/^internal_/, '') as InternalMetricType;

    if (!internalCompanyMap[companyId]) {
      internalCompanyMap[companyId] = {
        id: companyId,
        name: row.version ?? companyId,
        metrics: { capa: [], waferInput: [], utilization: [] },
      };
    }

    if (!internalCompanyMap[companyId].metrics[metricType]) {
      internalCompanyMap[companyId].metrics[metricType] = [];
    }
    internalCompanyMap[companyId].metrics[metricType].push({
      month: row.date,
      value: row.value ?? 0,
    });
  }

  // Sort each metric's months
  const internalCompanyData: Record<string, InternalCompanyData> = {};
  for (const [id, data] of Object.entries(internalCompanyMap)) {
    internalCompanyData[id] = {
      id: data.id,
      name: data.name,
      metrics: {
        capa: data.metrics.capa?.sort((a, b) => a.month.localeCompare(b.month)) ?? [],
        waferInput: data.metrics.waferInput?.sort((a, b) => a.month.localeCompare(b.month)) ?? [],
        utilization: data.metrics.utilization?.sort((a, b) => a.month.localeCompare(b.month)) ?? [],
      },
    };
  }

  // ── Reconstruct overlayColors ──────────────────────────────────────────────
  const overlayColors: Record<string, string> = {};
  for (const row of colorRows) {
    let color = row.version ?? '#64748b';
    // Color may be stored in metadata JSON
    if (color === '#64748b' && row.metadata) {
      try {
        const meta = JSON.parse(row.metadata) as { color?: string };
        if (meta.color) color = meta.color;
      } catch { /* ignore */ }
    }
    overlayColors[row.customer] = color;
  }

  // ── 5. Foundry Nodes ──────────────────────────────────────────────────────
  const foundryNodeRows = await queryMetrics(TAB, { category: 'foundry_node' });
  const foundryNodeColorRows = await queryMetrics(TAB, { category: 'foundry_node_color' });

  // Reconstruct: Record<FoundryCompanyId, FoundryNode[]>
  const foundryNodeMap: Record<string, Record<string, {
    id: string; label: string; company: string; category: 'advanced' | 'mature';
    monthly: FoundryNodeMonthly[];
  }>> = {};

  for (const r of foundryNodeRows) {
    // customer = "TSMC_7n", version = company
    const company = r.version ?? 'TSMC';
    let meta: { capa?: number; nodeId?: string; nodeLabel?: string; category?: string } = {};
    try { meta = JSON.parse(r.metadata ?? '{}'); } catch { /* ignore */ }
    const nodeId = meta.nodeId ?? r.customer;
    if (!foundryNodeMap[company]) foundryNodeMap[company] = {};
    if (!foundryNodeMap[company][nodeId]) {
      foundryNodeMap[company][nodeId] = {
        id: nodeId,
        label: meta.nodeLabel ?? nodeId,
        company,
        category: (meta.category as 'advanced' | 'mature') ?? 'mature',
        monthly: [],
      };
    }
    foundryNodeMap[company][nodeId].monthly.push({
      month: r.date,
      waferInput: r.value ?? 0,
      capa: meta.capa ?? 0,
    });
  }

  // Sort monthly data and build final structure
  const foundryNodes: Record<string, FoundryNode[]> = {};
  for (const [company, nodeMap] of Object.entries(foundryNodeMap)) {
    foundryNodes[company] = Object.values(nodeMap).map((n) => ({
      ...n,
      company: n.company as FoundryCompanyId,
      monthly: n.monthly.sort((a, b) => a.month.localeCompare(b.month)),
    }));
  }

  // Foundry node colors
  const foundryNodeColors: Record<string, string> = {};
  for (const r of foundryNodeColorRows) {
    foundryNodeColors[r.customer] = r.version ?? '#64748b';
  }

  // ── 6. Server Leading Indicators ─────────────────────────────────────────
  const serverRows = await queryMetrics(TAB, { category: 'server_indicator' });

  interface ServerIndicatorResult {
    id: string;
    group: string;
    subGroup: string;
    company: string;
    data: { month: string; value: number }[];
  }

  const serverMap: Record<string, ServerIndicatorResult> = {};
  const serverOrder: string[] = [];
  for (const r of serverRows) {
    const id = r.customer;
    let meta: { group?: string; subGroup?: string; company?: string } = {};
    try { meta = JSON.parse(r.metadata ?? '{}'); } catch { /* ignore */ }
    if (!serverMap[id]) {
      serverMap[id] = {
        id,
        group: meta.group ?? '',
        subGroup: meta.subGroup ?? '',
        company: meta.company ?? '',
        data: [],
      };
      serverOrder.push(id);
    }
    serverMap[id].data.push({ month: r.date, value: r.value ?? 0 });
  }
  const serverIndicators: ServerIndicatorResult[] = serverOrder.map((id) => {
    serverMap[id].data.sort((a, b) => a.month.localeCompare(b.month));
    return serverMap[id];
  });

  // ── 7. Memory Price Indicators ───────────────────────────────────────────
  const memPriceRows = await queryMetrics(TAB, { category: 'memory_price' });

  interface MemoryPriceResult {
    id: string;
    name: string;
    unit: string;
    data: { month: string; value: number }[];
  }

  const memPriceMap: Record<string, MemoryPriceResult> = {};
  const memPriceOrder: string[] = [];
  for (const r of memPriceRows) {
    const id = r.customer;
    if (!memPriceMap[id]) {
      memPriceMap[id] = {
        id,
        name: r.version ?? id,
        unit: r.unit ?? '$',
        data: [],
      };
      memPriceOrder.push(id);
    }
    memPriceMap[id].data.push({ month: r.date, value: r.value ?? 0 });
  }
  const memoryPriceIndicators: MemoryPriceResult[] = memPriceOrder.map((id) => {
    memPriceMap[id].data.sort((a, b) => a.month.localeCompare(b.month));
    return memPriceMap[id];
  });

  return NextResponse.json({
    categories,
    internalCompanyData,
    overlayColors,
    months,
    tableMonths,
    foundryNodes,
    foundryNodeColors,
    serverIndicators,
    memoryPriceIndicators,
  });
}
