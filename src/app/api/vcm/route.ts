import { NextResponse } from 'next/server';
import type { MetricRow } from '@/lib/db';
import { queryAll } from '@/lib/db';
import type {
  VcmData,
  VcmVersion,
  ApplicationDemand,
  ApplicationType,
  AppCategoryType,
  DeviceType,
  DeviceWaferDemand,
  MountPerUnit,
  TotalWaferDemand,
  TotalWaferQuarterlyEntry,
  VcmNews,
  QuarterlyValue,
  DeviceStackedEntry,
} from '@/types/indicators';
import { TOTAL_WAFER_YEARLY, DEVICE_STACKED_YEARLY, APP_YEARLY_DEMANDS, DEVICE_STACKED_YEARLY_BY_APP, TOTAL_WAFER_DEMAND_BY_APP as TOTAL_WAFER_DEMAND_BY_APP_MOCK, YEARLY_MOUNT_PER_UNIT_BY_CATEGORY } from '@/data/vcm-mock';

function parseMeta<T>(row: MetricRow): T {
  try {
    return JSON.parse(row.metadata ?? '{}') as T;
  } catch {
    return {} as T;
  }
}

export async function GET() {
  const TAB = 'vcm';
  const rows = await queryAll(TAB);

  // ── Group rows by category ─────────────────────────────────────────────────
  const byCategory: Record<string, MetricRow[]> = {};
  for (const row of rows) {
    if (!byCategory[row.category]) byCategory[row.category] = [];
    byCategory[row.category].push(row);
  }

  // ── versions ──────────────────────────────────────────────────────────────
  // category='vcmVersion', customer=id, version=label, date=date string
  const versions: VcmVersion[] = (byCategory['vcmVersion'] ?? []).map((r) => ({
    id: r.customer,
    label: r.version ?? r.customer,
    date: r.date,
  }));

  // ── applicationDemands ────────────────────────────────────────────────────
  // category='appDemand', customer=application, date=year(string), value=demand, is_estimate
  // version=label, metadata={application}
  const appDemandRows = byCategory['appDemand'] ?? [];
  const appDemandMap: Record<string, { application: ApplicationType; label: string; yearly: { year: number; value: number; isEstimate: boolean }[] }> = {};
  for (const r of appDemandRows) {
    const app = r.customer as ApplicationType;
    if (!appDemandMap[app]) {
      appDemandMap[app] = { application: app, label: r.version ?? app, yearly: [] };
    }
    appDemandMap[app].yearly.push({
      year: parseInt(r.date, 10),
      value: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  // Sort yearly by year
  for (const v of Object.values(appDemandMap)) {
    v.yearly.sort((a, b) => a.year - b.year);
  }
  const applicationDemands = appDemandMap as Record<ApplicationType, ApplicationDemand>;

  // ── deviceWaferDemands ────────────────────────────────────────────────────
  // category='deviceWaferDemand', customer=device, date=year, value=waferDemand, version=label
  const deviceRows = byCategory['deviceWaferDemand'] ?? [];
  const deviceMap: Record<string, { device: DeviceType; label: string; yearly: { year: number; waferDemand: number; isEstimate: boolean }[] }> = {};
  for (const r of deviceRows) {
    const dev = r.customer as DeviceType;
    if (!deviceMap[dev]) {
      deviceMap[dev] = { device: dev, label: r.version ?? dev, yearly: [] };
    }
    deviceMap[dev].yearly.push({
      year: parseInt(r.date, 10),
      waferDemand: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  for (const v of Object.values(deviceMap)) {
    v.yearly.sort((a, b) => a.year - b.year);
  }
  const deviceWaferDemands = deviceMap as Record<DeviceType, DeviceWaferDemand>;

  // ── mountPerUnit ──────────────────────────────────────────────────────────
  // category='mountPerUnit', customer=label, version=serverType('traditional'|'ai'),
  // date=year, value=value, unit=unit, metadata={serverType}
  const mountRows = byCategory['mountPerUnit'] ?? [];
  interface MountKey { serverType: string; label: string }
  const mountMap: Map<string, { serverType: MountPerUnit['serverType']; label: string; metrics: { year: number; value: number; unit: string }[] }> = new Map();
  for (const r of mountRows) {
    const meta = parseMeta<{ serverType?: string }>(r);
    const serverType = (meta.serverType ?? r.version ?? 'traditional') as MountPerUnit['serverType'];
    const label = r.customer;
    const key = `${serverType}::${label}`;
    if (!mountMap.has(key)) {
      mountMap.set(key, { serverType, label, metrics: [] });
    }
    mountMap.get(key)!.metrics.push({
      year: parseInt(r.date, 10),
      value: r.value ?? 0,
      unit: r.unit ?? '',
    });
  }
  const mountPerUnit: MountPerUnit[] = Array.from(mountMap.values()).map((v) => ({
    ...v,
    metrics: v.metrics.sort((a, b) => a.year - b.year),
  }));

  // ── mountPerUnitByApp ─────────────────────────────────────────────────────
  // category='mountPerUnitByApp_{application}', same structure
  const mountByAppMap: Record<string, MountPerUnit[]> = {};
  for (const [cat, catRows] of Object.entries(byCategory)) {
    if (!cat.startsWith('mountPerUnitByApp_')) continue;
    const app = cat.replace('mountPerUnitByApp_', '');
    const innerMap: Map<string, { serverType: MountPerUnit['serverType']; label: string; metrics: { year: number; value: number; unit: string }[] }> = new Map();
    for (const r of catRows) {
      const meta = parseMeta<{ serverType?: string }>(r);
      const serverType = (meta.serverType ?? r.version ?? 'traditional') as MountPerUnit['serverType'];
      const label = r.customer;
      const key = `${serverType}::${label}`;
      if (!innerMap.has(key)) {
        innerMap.set(key, { serverType, label, metrics: [] });
      }
      innerMap.get(key)!.metrics.push({
        year: parseInt(r.date, 10),
        value: r.value ?? 0,
        unit: r.unit ?? '',
      });
    }
    mountByAppMap[app] = Array.from(innerMap.values()).map((v) => ({
      ...v,
      metrics: v.metrics.sort((a, b) => a.year - b.year),
    }));
  }
  const mountPerUnitByApp = mountByAppMap as Record<ApplicationType, MountPerUnit[]>;

  // ── totalWaferDemand ──────────────────────────────────────────────────────
  // category='totalWaferDemand', customer='total', date=year, value=total
  const totalRows = byCategory['totalWaferDemand'] ?? [];
  const totalWaferDemand: TotalWaferDemand[] = totalRows
    .map((r) => ({
      year: parseInt(r.date, 10),
      total: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    }))
    .sort((a, b) => a.year - b.year);

  // ── totalWaferDemandByApp ─────────────────────────────────────────────────
  // category='totalWaferDemandByApp', customer=application, date=year
  const totalByAppRows = byCategory['totalWaferDemandByApp'] ?? [];
  const totalByAppMap: Record<string, TotalWaferDemand[]> = {};
  for (const r of totalByAppRows) {
    const app = r.customer;
    if (!totalByAppMap[app]) totalByAppMap[app] = [];
    totalByAppMap[app].push({
      year: parseInt(r.date, 10),
      total: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  for (const v of Object.values(totalByAppMap)) v.sort((a, b) => a.year - b.year);
  const totalWaferDemandByApp = totalByAppMap as Record<ApplicationType, TotalWaferDemand[]>;

  // ── totalWaferQuarterly ───────────────────────────────────────────────────
  // Three separate category rows: 'totalWaferQuarterly_total', '_pw', '_epi'
  // date=quarter, value=number
  const twqTotal = byCategory['totalWaferQuarterly_total'] ?? [];
  const twqPw = byCategory['totalWaferQuarterly_pw'] ?? [];
  const twqEpi = byCategory['totalWaferQuarterly_epi'] ?? [];
  // Build quarter-keyed maps
  const twqPwMap: Record<string, number> = {};
  const twqEpiMap: Record<string, number> = {};
  const twqIsEstimate: Record<string, boolean> = {};
  for (const r of twqPw) twqPwMap[r.date] = r.value ?? 0;
  for (const r of twqEpi) twqEpiMap[r.date] = r.value ?? 0;
  for (const r of twqTotal) twqIsEstimate[r.date] = r.is_estimate === 1;
  const totalWaferQuarterly: TotalWaferQuarterlyEntry[] = twqTotal.map((r) => ({
    quarter: r.date,
    total: r.value ?? 0,
    pw: twqPwMap[r.date] ?? 0,
    epi: twqEpiMap[r.date] ?? 0,
    isEstimate: r.is_estimate === 1,
  }));

  // ── news ──────────────────────────────────────────────────────────────────
  // category='vcmNews', customer=source, date=date, version=title, metadata={summary}
  const newsRows = byCategory['vcmNews'] ?? [];
  const news: VcmNews[] = newsRows.map((r) => {
    const meta = parseMeta<{ summary?: string; title?: string }>(r);
    return {
      source: r.customer,
      date: r.date,
      title: meta.title ?? r.version ?? '',
      summary: meta.summary ?? '',
    };
  });

  // ── newsQueries (per ApplicationType) ─────────────────────────────────────
  // category='newsQuery', customer=application, metadata={queryKo, queryEn}
  const newsQueryRows = byCategory['newsQuery'] ?? [];
  const newsQueriesMap: Record<string, { queryKo: string; queryEn: string }> = {};
  for (const r of newsQueryRows) {
    const meta = parseMeta<{ queryKo?: string; queryEn?: string }>(r);
    newsQueriesMap[r.customer] = {
      queryKo: meta.queryKo ?? '',
      queryEn: meta.queryEn ?? '',
    };
  }
  const newsQueries = newsQueriesMap as Record<ApplicationType, { queryKo: string; queryEn: string }>;

  // ── newsQueriesByCategory ─────────────────────────────────────────────────
  // category='newsQueryByCategory', customer=appCategoryType, metadata={queryKo, queryEn}
  const newsByCatRows = byCategory['newsQueryByCategory'] ?? [];
  const newsQueriesByCategoryMap: Record<string, { queryKo: string; queryEn: string }> = {};
  for (const r of newsByCatRows) {
    const meta = parseMeta<{ queryKo?: string; queryEn?: string }>(r);
    newsQueriesByCategoryMap[r.customer] = {
      queryKo: meta.queryKo ?? '',
      queryEn: meta.queryEn ?? '',
    };
  }
  const newsQueriesByCategory = newsQueriesByCategoryMap as Record<AppCategoryType, { queryKo: string; queryEn: string }>;

  // ── applicationTable ──────────────────────────────────────────────────────
  // category='applicationTable', customer=application(label string), date=year
  const appTableRows = byCategory['applicationTable'] ?? [];
  const appTableMap: Record<string, { application: string; yearly: { year: number; value: number; isEstimate: boolean }[] }> = {};
  for (const r of appTableRows) {
    const label = r.customer;
    if (!appTableMap[label]) appTableMap[label] = { application: label, yearly: [] };
    appTableMap[label].yearly.push({
      year: parseInt(r.date, 10),
      value: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  for (const v of Object.values(appTableMap)) v.yearly.sort((a, b) => a.year - b.year);
  const applicationTable = Object.values(appTableMap);

  // ── applicationQuarterlyDemands ───────────────────────────────────────────
  // category='quarterlyDemand', customer=application, date=quarter, metadata={application}
  const qDemandRows = byCategory['quarterlyDemand'] ?? [];
  const qDemandMap: Record<string, QuarterlyValue[]> = {};
  for (const r of qDemandRows) {
    const meta = parseMeta<{ application?: string }>(r);
    const app = meta.application ?? r.customer;
    if (!qDemandMap[app]) qDemandMap[app] = [];
    qDemandMap[app].push({
      quarter: r.date,
      value: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  const applicationQuarterlyDemands = qDemandMap as Record<ApplicationType, QuarterlyValue[]>;

  // ── deviceStackedByApp ────────────────────────────────────────────────────
  // DB: category='stacked_{deviceType}', customer=appLabel, date=quarter,
  //     metadata={application: appKey}, value=Kwsm
  // Need to group by application key, then by quarter, then set device values
  const stackedAppMap: Record<string, Record<string, Partial<DeviceStackedEntry>>> = {};
  for (const [cat, catRows] of Object.entries(byCategory)) {
    if (!cat.startsWith('stacked_')) continue;
    const deviceType = cat.replace('stacked_', ''); // e.g., 'dram', 'hbm'
    for (const r of catRows) {
      const meta = parseMeta<{ application?: string }>(r);
      const app = meta.application ?? r.customer;
      const quarter = r.date;
      if (!stackedAppMap[app]) stackedAppMap[app] = {};
      if (!stackedAppMap[app][quarter]) {
        stackedAppMap[app][quarter] = {
          quarter,
          isEstimate: r.is_estimate === 1,
          dram: 0, hbm: 0, nand: 0, otherMemory: 0,
          logic: 0, analog: 0, discrete: 0, sensor: 0,
        };
      }
      (stackedAppMap[app][quarter] as Record<string, unknown>)[deviceType] = r.value ?? 0;
      if (r.is_estimate === 1) stackedAppMap[app][quarter]!.isEstimate = true;
    }
  }
  const deviceStackedByApp: Record<ApplicationType, DeviceStackedEntry[]> = {} as Record<ApplicationType, DeviceStackedEntry[]>;
  for (const [app, quarterMap] of Object.entries(stackedAppMap)) {
    deviceStackedByApp[app as ApplicationType] = Object.values(quarterMap) as DeviceStackedEntry[];
  }

  // ── quarterlyMountPerUnit ─────────────────────────────────────────────────
  // category='quarterlyMountPerUnit', customer=application, date=quarter
  const qMountRows = byCategory['quarterlyMountPerUnit'] ?? [];
  const qMountMap: Record<string, QuarterlyValue[]> = {};
  for (const r of qMountRows) {
    const app = r.customer;
    if (!qMountMap[app]) qMountMap[app] = [];
    qMountMap[app].push({
      quarter: r.date,
      value: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  const quarterlyMountPerUnit = qMountMap as Record<ApplicationType, QuarterlyValue[]>;

  // ── mountPerUnitByCategory ────────────────────────────────────────────────
  // category='mountPerUnitByCategory_{appCategory}', same structure as mountPerUnit
  const mountByCatMap: Record<string, MountPerUnit[]> = {};
  for (const [cat, catRows] of Object.entries(byCategory)) {
    if (!cat.startsWith('mountPerUnitByCategory_')) continue;
    const appCat = cat.replace('mountPerUnitByCategory_', '');
    const innerMap: Map<string, { serverType: MountPerUnit['serverType']; label: string; metrics: { year: number; value: number; unit: string }[] }> = new Map();
    for (const r of catRows) {
      const meta = parseMeta<{ serverType?: string }>(r);
      const serverType = (meta.serverType ?? r.version ?? 'traditional') as MountPerUnit['serverType'];
      const label = r.customer;
      const key = `${serverType}::${label}`;
      if (!innerMap.has(key)) innerMap.set(key, { serverType, label, metrics: [] });
      innerMap.get(key)!.metrics.push({ year: parseInt(r.date, 10), value: r.value ?? 0, unit: r.unit ?? '' });
    }
    mountByCatMap[appCat] = Array.from(innerMap.values()).map((v) => ({
      ...v,
      metrics: v.metrics.sort((a, b) => a.year - b.year),
    }));
  }
  const mountPerUnitByCategory = mountByCatMap as Record<AppCategoryType, MountPerUnit[]>;

  // ── Assemble VcmData ──────────────────────────────────────────────────────
  const vcmData: VcmData = {
    versions,
    applicationDemands,
    deviceWaferDemands,
    mountPerUnit,
    mountPerUnitByApp,
    totalWaferDemand,
    totalWaferDemandByApp,
    totalWaferQuarterly,
    news,
    newsQueries,
    applicationTable,
    applicationQuarterlyDemands,
    deviceStackedByApp,
    quarterlyMountPerUnit,
  };

  // Merge DB totalWaferDemandByApp with mock data for years not in DB (2027-2030)
  const mergedTotalWaferDemandByApp: Record<string, TotalWaferDemand[]> = {};
  for (const [app, mockRows] of Object.entries(TOTAL_WAFER_DEMAND_BY_APP_MOCK)) {
    const dbRows = totalWaferDemandByApp[app as ApplicationType] ?? [];
    const dbYears = new Set(dbRows.map((r) => r.year));
    const extra = mockRows.filter((r) => !dbYears.has(r.year));
    mergedTotalWaferDemandByApp[app] = [...dbRows, ...extra].sort((a, b) => a.year - b.year);
  }

  return NextResponse.json({
    ...vcmData,
    totalWaferDemandByApp: mergedTotalWaferDemandByApp,
    newsQueriesByCategory,
    mountPerUnitByCategory,
    yearlyMountPerUnitByCategory: YEARLY_MOUNT_PER_UNIT_BY_CATEGORY,
    totalWaferYearly: TOTAL_WAFER_YEARLY,
    deviceStackedYearly: DEVICE_STACKED_YEARLY,
    appYearlyDemands: APP_YEARLY_DEMANDS,
    deviceStackedYearlyByApp: DEVICE_STACKED_YEARLY_BY_APP,
  });
}
