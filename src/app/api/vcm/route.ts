import { NextResponse } from 'next/server';
import type { MetricRow } from '@/lib/db';
import { parseMeta, queryAll } from '@/lib/db';
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
  VcmNews,
  TotalWaferYearlyEntry,
  DeviceStackedYearlyEntry,
  YearlyValue,
} from '@/types/indicators';

export async function GET(request: Request) {
  try {
  const TAB = 'vcm';
  const { searchParams } = new URL(request.url);
  const versionParam = searchParams.get('version');

  const allRows = await queryAll(TAB);

  // version 미지정 시 첫 번째 버전을 기본값으로 사용 (중복 key 방지)
  let effectiveVersion = versionParam;
  if (!effectiveVersion) {
    const firstVersionRow = allRows.find((r) => r.category === 'vcmVersion');
    effectiveVersion = firstVersionRow?.customer ?? null;
  }
  let rows: MetricRow[];
  if (effectiveVersion) {
    rows = allRows.filter((r) => r.version === effectiveVersion || r.version === null);
  } else {
    rows = allRows;
  }

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
    news,
    newsQueries,
    applicationTable,
  };

  // ── totalWaferYearly ─────────────────────────────────────────────────────
  // category='totalWaferYearly', customer='Total', date=year, value=total, metadata={pw, epi}
  const twYearlyRows = byCategory['totalWaferYearly'] ?? [];
  const parseTwRow = (r: MetricRow) => {
    const meta = parseMeta<{ pw?: number; epi?: number }>(r);
    return {
      year: parseInt(r.date, 10),
      total: r.value ?? 0,
      pw: meta.pw ?? 0,
      epi: meta.epi ?? 0,
      isEstimate: r.is_estimate === 1,
    };
  };
  const totalWaferYearly: TotalWaferYearlyEntry[] = twYearlyRows
    .filter((r) => r.customer !== 'Internal')
    .map(parseTwRow)
    .sort((a, b) => a.year - b.year);

  // ── totalWaferYearlyInternal ─────────────────────────────────────────────
  const totalWaferYearlyInternal: TotalWaferYearlyEntry[] = twYearlyRows
    .filter((r) => r.customer === 'Internal')
    .map(parseTwRow)
    .sort((a, b) => a.year - b.year);

  // ── deviceStackedYearly ────────────────────────────────────────────────
  // category='deviceStackedYearly', customer='All', date=year, metadata={dram,hbm,...}
  const dsYearlyRows = byCategory['deviceStackedYearly'] ?? [];
  const deviceStackedYearly: DeviceStackedYearlyEntry[] = dsYearlyRows
    .map((r) => {
      const meta = parseMeta<Record<string, number>>(r);
      return {
        year: parseInt(r.date, 10),
        isEstimate: r.is_estimate === 1,
        dram: meta.dram ?? 0,
        hbm: meta.hbm ?? 0,
        nand: meta.nand ?? 0,
        otherMemory: meta.otherMemory ?? 0,
        logic: meta.logic ?? 0,
        analog: meta.analog ?? 0,
        discrete: meta.discrete ?? 0,
        sensor: meta.sensor ?? 0,
      };
    })
    .sort((a, b) => a.year - b.year);

  // ── appYearlyDemands ───────────────────────────────────────────────────
  // category='appYearlyDemand', customer=appKey, date=year, value=demand
  const appYearlyRows = byCategory['appYearlyDemand'] ?? [];
  const appYearlyMap: Record<string, YearlyValue[]> = {};
  for (const r of appYearlyRows) {
    const app = r.customer;
    if (!appYearlyMap[app]) appYearlyMap[app] = [];
    appYearlyMap[app].push({
      year: parseInt(r.date, 10),
      value: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  for (const v of Object.values(appYearlyMap)) v.sort((a, b) => a.year - b.year);
  const appYearlyDemands = appYearlyMap as Record<ApplicationType, YearlyValue[]>;

  // ── deviceStackedYearlyByApp ───────────────────────────────────────────
  // category='deviceStackedYearlyByApp', customer=appKey, date=year, metadata={dram,...}
  const dsYearlyByAppRows = byCategory['deviceStackedYearlyByApp'] ?? [];
  const dsYearlyByAppMap: Record<string, DeviceStackedYearlyEntry[]> = {};
  for (const r of dsYearlyByAppRows) {
    const app = r.customer;
    const meta = parseMeta<Record<string, number>>(r);
    if (!dsYearlyByAppMap[app]) dsYearlyByAppMap[app] = [];
    dsYearlyByAppMap[app].push({
      year: parseInt(r.date, 10),
      isEstimate: r.is_estimate === 1,
      dram: meta.dram ?? 0,
      hbm: meta.hbm ?? 0,
      nand: meta.nand ?? 0,
      otherMemory: meta.otherMemory ?? 0,
      logic: meta.logic ?? 0,
      analog: meta.analog ?? 0,
      discrete: meta.discrete ?? 0,
      sensor: meta.sensor ?? 0,
    });
  }
  for (const v of Object.values(dsYearlyByAppMap)) v.sort((a, b) => a.year - b.year);
  const deviceStackedYearlyByApp = dsYearlyByAppMap as Record<ApplicationType, DeviceStackedYearlyEntry[]>;

  // ── totalWaferDemandByAppYearly ────────────────────────────────────────
  // category='totalWaferDemandByAppYearly', customer=appKey, date=year, value=total
  const twdByAppYearlyRows = byCategory['totalWaferDemandByAppYearly'] ?? [];
  const twdByAppYearlyMap: Record<string, TotalWaferDemand[]> = {};
  for (const r of twdByAppYearlyRows) {
    const app = r.customer;
    if (!twdByAppYearlyMap[app]) twdByAppYearlyMap[app] = [];
    twdByAppYearlyMap[app].push({
      year: parseInt(r.date, 10),
      total: r.value ?? 0,
      isEstimate: r.is_estimate === 1,
    });
  }
  for (const v of Object.values(twdByAppYearlyMap)) v.sort((a, b) => a.year - b.year);
  const totalWaferDemandByApp = twdByAppYearlyMap as Record<ApplicationType, TotalWaferDemand[]>;

  // ── yearlyMountPerUnitByCategory ───────────────────────────────────────
  // category='yearlyMountPerUnitByCategory', customer=label, date=year,
  //   value=value, unit=unit, metadata={categoryType, serverType}
  const ymRows = byCategory['yearlyMountPerUnitByCategory'] ?? [];
  const ymByCatMap: Record<string, MountPerUnit[]> = {};
  for (const r of ymRows) {
    const meta = parseMeta<{ categoryType?: string; serverType?: string }>(r);
    const catType = meta.categoryType ?? 'unknown';
    const serverType = (meta.serverType ?? 'traditional') as MountPerUnit['serverType'];
    const label = r.customer;
    if (!ymByCatMap[catType]) ymByCatMap[catType] = [];
    // Find or create the entry in the array
    let entry = ymByCatMap[catType].find(
      (e) => e.serverType === serverType && e.label === label,
    );
    if (!entry) {
      entry = { serverType, label, metrics: [] };
      ymByCatMap[catType].push(entry);
    }
    entry.metrics.push({
      year: parseInt(r.date, 10),
      value: r.value ?? 0,
      unit: r.unit ?? '',
    });
  }
  for (const entries of Object.values(ymByCatMap)) {
    for (const e of entries) e.metrics.sort((a, b) => a.year - b.year);
  }
  const yearlyMountPerUnitByCategory = ymByCatMap as Record<AppCategoryType, MountPerUnit[]>;

  return NextResponse.json({
    ...vcmData,
    totalWaferDemandByApp,
    newsQueriesByCategory,
    mountPerUnitByCategory,
    yearlyMountPerUnitByCategory,
    totalWaferYearly,
    totalWaferYearlyInternal,
    deviceStackedYearly,
    appYearlyDemands,
    deviceStackedYearlyByApp,
    selectedVersion: versionParam ?? null,
  });
  } catch (err) {
    console.error('[vcm] GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
