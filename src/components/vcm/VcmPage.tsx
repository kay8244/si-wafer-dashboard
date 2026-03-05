'use client';

import { useState, useMemo } from 'react';
import { parseAiBullets, renderWithRefs, CollapsibleBullet, SourceBadge } from '@/lib/news-utils';
import type { AppCategoryItem, AppCategoryType, ApplicationType, DeviceFilterItem, DeviceStackedEntry, TotalWaferQuarterlyEntry } from '@/types/indicators';
import { VCM_DATA, NEWS_QUERIES_BY_CATEGORY } from '@/data/vcm-mock';
import { useNews, type NewsArticle } from '@/hooks/useNews';
import TotalWaferLineChart, { type TimeRange } from './TotalWaferLineChart';
import DemandBarChart from './DemandBarChart';
import DeviceStackedChart from './DeviceStackedChart';

const APP_COLORS: Record<AppCategoryType, string> = {
  server: '#3b82f6',
  smartphone: '#10b981',
  pc: '#f59e0b',
  automotive: '#ef4444',
  industrial: '#06b6d4',
};

const INITIAL_APP_CATEGORIES: AppCategoryItem[] = [
  { category: 'server',     label: 'Server',     checked: true,  subTypes: ['traditionalServer', 'aiServer'] },
  { category: 'smartphone', label: 'Smartphone', checked: false, subTypes: ['smartphone'] },
  { category: 'pc',         label: 'PC',         checked: false, subTypes: ['pcNotebook'] },
  { category: 'automotive', label: 'Automotive', checked: false, subTypes: ['electricVehicle', 'automotive'] },
  { category: 'industrial', label: 'Industrial', checked: false, subTypes: ['ioe'] },
];

const INITIAL_DEVICE_FILTERS: DeviceFilterItem[] = [
  { type: 'dram',        label: 'DRAM',         checked: true },
  { type: 'hbm',         label: 'HBM',          checked: true },
  { type: 'nand',        label: 'NAND',         checked: true },
  { type: 'otherMemory', label: 'Other Memory', checked: true },
  { type: 'logic',       label: 'Logic',        checked: true },
  { type: 'analog',      label: 'Analog',       checked: true },
  { type: 'discrete',    label: 'Discrete',     checked: true },
  { type: 'sensor',      label: 'Sensor',       checked: true },
];

/* ────────────────────────────────────────────────────────────
   Inline News: AI summary (bullet format) + clickable refs + collapsible articles
   ──────────────────────────────────────────────────────────── */
function InlineNews({
  articles,
  answer,
  loading,
  accentColor,
  label,
}: {
  articles: NewsArticle[];
  answer: string | null;
  loading: boolean;
  accentColor: string;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const list = articles.slice(0, 10);

  const bullets = useMemo(() => parseAiBullets(answer), [answer]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="rounded-lg border-l-4 bg-gradient-to-r from-gray-50 to-white p-3 dark:from-gray-700/50 dark:to-gray-800" style={{ borderLeftColor: accentColor }}>
          <div className="mb-2 flex items-center gap-1.5">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300" style={{ borderTopColor: accentColor }} />
            <span className="text-xs font-bold" style={{ color: accentColor }}>AI 기사 요약 ({label})</span>
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-600" />
            <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
            <div className="h-3 w-4/6 rounded bg-gray-200 dark:bg-gray-600" />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">기사를 수집하고 AI 요약을 생성하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (!answer && list.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* AI Summary — bullet format with clickable refs */}
      {bullets.length > 0 && (
        <div
          className="rounded-lg border-l-4 bg-gradient-to-r from-gray-50 to-white p-3 dark:from-gray-700/50 dark:to-gray-800"
          style={{ borderLeftColor: accentColor }}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            <span className="text-xs font-bold" style={{ color: accentColor }}>AI 기사 요약 ({label})</span>

          </div>
          <ul className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            {bullets.map((bullet, idx) => (
              <CollapsibleBullet key={idx} text={bullet} articles={list} accentColor={accentColor} />
            ))}
          </ul>
        </div>
      )}

      {/* Collapsible articles */}
      {list.length > 0 && (
        <div className={bullets.length > 0 ? 'mt-2' : ''}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            관련 기사 {list.length}건
          </button>

          {expanded && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {list.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-2.5 transition-all hover:border-gray-200 hover:shadow-sm dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-gray-500"
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-semibold leading-snug text-gray-800 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                      {article.title}
                    </h4>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                      <SourceBadge source={article.source} size="xs" />
                      {article.publishedDate && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>{new Date(article.publishedDate).toLocaleDateString('ko-KR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   AI Wafer Demand Analysis
   Total Wafer = Application 수요 x 대당 탑재량
   ──────────────────────────────────────────────────────────── */
function WaferDemandAnalysis({
  data,
  articles,
  aiAnswer,
  loading,
}: {
  data: TotalWaferQuarterlyEntry[];
  articles: NewsArticle[];
  aiAnswer: string | null;
  loading: boolean;
}) {
  const list = articles.slice(0, 10);
  const [showSources, setShowSources] = useState(false);

  const analysis = useMemo(() => {
    if (data.length < 2) return null;

    let currentIdx = data.length - 1;
    for (let i = data.length - 1; i >= 0; i--) {
      if (!data[i].isEstimate) { currentIdx = i; break; }
    }

    const current = data[currentIdx];
    const prev = data[currentIdx - 1];
    if (!current || !prev) return null;

    const totalChange = ((current.total - prev.total) / prev.total * 100).toFixed(1);
    const pwChange = ((current.pw - prev.pw) / prev.pw * 100).toFixed(1);
    const epiChange = ((current.epi - prev.epi) / prev.epi * 100).toFixed(1);

    const totalDelta = current.total - prev.total;
    const pwDelta = current.pw - prev.pw;
    const epiDelta = current.epi - prev.epi;
    const pwContrib = totalDelta !== 0 ? Math.abs(Math.round((pwDelta / totalDelta) * 100)) : 0;
    const epiContrib = totalDelta !== 0 ? Math.abs(Math.round((epiDelta / totalDelta) * 100)) : 0;

    const mainDriver = Math.abs(pwDelta) > Math.abs(epiDelta) ? 'PW' : 'EPI';

    const nextEst = currentIdx + 1 < data.length ? data[currentIdx + 1] : null;
    let futureChange: string | null = null;
    if (nextEst) {
      futureChange = ((nextEst.total - current.total) / current.total * 100).toFixed(1);
    }

    return {
      current, prev, totalChange, pwChange, epiChange,
      pwContrib, epiContrib, mainDriver, nextEst, futureChange,
    };
  }, [data]);

  const aiBullets = useMemo(() => parseAiBullets(aiAnswer), [aiAnswer]);

  if (!analysis) return null;

  const { current, totalChange, pwChange, epiChange, pwContrib, epiContrib, mainDriver, nextEst, futureChange } = analysis;
  const isUp = Number(totalChange) >= 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-1.5">
        <svg className="h-4 w-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span className="text-[13px] font-bold text-purple-600 dark:text-purple-400">AI Wafer 수요 분석</span>
        {loading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-purple-500" />}
      </div>
      <ul className="space-y-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
        <li className="flex gap-1.5">
          <span className="shrink-0 text-gray-400">•</span>
          <span>
            {current.quarter} Total Wafer 수요{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{current.total.toLocaleString()} Kwsm</span>
            {' '}(QoQ{' '}
            <span className={`font-semibold ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
              {isUp ? '+' : ''}{totalChange}%
            </span>)
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="shrink-0 text-gray-400">•</span>
          <span>PW: {current.pw.toLocaleString()} Kwsm (QoQ {Number(pwChange) >= 0 ? '+' : ''}{pwChange}%, 기여도 {pwContrib}%)</span>
        </li>
        <li className="flex gap-1.5">
          <span className="shrink-0 text-gray-400">•</span>
          <span>EPI: {current.epi.toLocaleString()} Kwsm (QoQ {Number(epiChange) >= 0 ? '+' : ''}{epiChange}%, 기여도 {epiContrib}%)</span>
        </li>

        {/* Section header for AI news summary */}
        <li className="mt-2 flex gap-1.5">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
            </svg>
            <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400">Wafer 수요 관련 기사 요약</span>
          </span>
        </li>
        {/* AI-sourced analysis for 주요 변동 요인 / 향후 전망 */}
        {loading && aiBullets.length === 0 && (
          <li className="mt-1">
            <div className="rounded-lg border-l-4 border-purple-400 bg-gradient-to-r from-purple-50 to-white p-3 dark:from-purple-900/20 dark:to-gray-800">
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-purple-500" />
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Wafer 수요 관련 기사 요약</span>
              </div>
              <div className="animate-pulse space-y-2">
                <div className="h-3.5 w-5/6 rounded bg-purple-100 dark:bg-purple-800/30" />
                <div className="h-3.5 w-3/4 rounded bg-purple-100 dark:bg-purple-800/30" />
                <div className="h-3.5 w-4/6 rounded bg-purple-100 dark:bg-purple-800/30" />
              </div>
              <p className="mt-2 text-[12px] text-gray-400">기사를 수집하고 AI 요약을 생성하고 있습니다...</p>
            </div>
          </li>
        )}
        {aiBullets.length > 0 ? (
          aiBullets.map((bullet, idx) => (
            <CollapsibleBullet key={idx} text={bullet} articles={list} accentColor="#8b5cf6" />
          ))
        ) : !loading && (
          <>
            <li className="flex gap-1.5">
              <span className="shrink-0 text-gray-400">•</span>
              <span>
                주요 변동 요인: {mainDriver === 'PW'
                  ? 'AI Server 수요 확대에 따른 HBM 탑재량 증가가 PW 수요를 견인. Server당 HBM 탑재 수 증가 및 Advanced Packaging 수요 확대가 주요 원인'
                  : 'EPI 수요 증가는 전장(Automotive) 및 IoT 분야 확대에 기인. 차량용 반도체 탑재량 증가와 EV 보급 확대가 주요 동인'
                }
              </span>
            </li>
            {nextEst && futureChange && (
              <li className="flex gap-1.5">
                <span className="shrink-0 text-gray-400">•</span>
                <span>
                  {nextEst.quarter} 전망: Total {nextEst.total.toLocaleString()} Kwsm
                  {' '}(QoQ {Number(futureChange) >= 0 ? '+' : ''}{futureChange}%)
                  {Number(futureChange) > 0
                    ? ' — AI/HPC 수요 확대 및 계절적 수요 회복에 따른 상승 전망'
                    : ' — 수요 조정 구간 진입, 재고 조정 영향 예상'
                  }
                </span>
              </li>
            )}
          </>
        )}
      </ul>

      {/* Collapsible source articles */}
      {list.length > 0 && (
        <div className="mt-2 border-t border-gray-100 pt-2 dark:border-gray-700">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showSources ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            출처 {list.length}건
          </button>

          {showSources && (
            <div className="mt-1.5 flex flex-col gap-1">
              {list.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-snug text-gray-700 group-hover:text-purple-600 dark:text-gray-300 dark:group-hover:text-purple-400 line-clamp-1">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                      <SourceBadge source={article.source} size="xs" />
                      {article.publishedDate && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>{new Date(article.publishedDate).toLocaleDateString('ko-KR')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VCM Page — Main Layout
   ════════════════════════════════════════════════════════════ */
export default function VcmPage() {
  const [version, setVersion] = useState(VCM_DATA.versions[0].id);
  const [appCategories, setAppCategories] = useState<AppCategoryItem[]>(INITIAL_APP_CATEGORIES);
  const [deviceFilters, setDeviceFilters] = useState<DeviceFilterItem[]>(INITIAL_DEVICE_FILTERS);
  const [timeRange, setTimeRange] = useState<TimeRange>(8);

  const selectedCategory = useMemo<AppCategoryItem>(() => {
    return appCategories.find((c) => c.checked) ?? INITIAL_APP_CATEGORIES[0];
  }, [appCategories]);

  const isServerCategory = selectedCategory.category === 'server';
  const primaryApp = selectedCategory.subTypes[0] as ApplicationType;
  const secondaryApp = isServerCategory ? selectedCategory.subTypes[1] as ApplicationType : undefined;

  const primaryAppLabel = selectedCategory.label;
  const categoryKey = selectedCategory.category;

  const newsQuery = useMemo(() => {
    return NEWS_QUERIES_BY_CATEGORY[categoryKey];
  }, [categoryKey]);

  const appContext = `${selectedCategory.label} 반도체 수요 및 실리콘 웨이퍼 영향`;
  const { articles, answer, loading: newsLoading } = useNews(newsQuery.queryKo, newsQuery.queryEn, undefined, appContext);

  // Wafer demand analysis news
  const { articles: waferArticles, answer: waferAnswer, loading: waferNewsLoading } = useNews(
    '반도체 웨이퍼 수요 전망 HBM AI서버 EPI 실리콘',
    'semiconductor wafer demand outlook HBM AI server silicon',
    undefined,
    '실리콘 웨이퍼 수요 전망 - 반도체 업황이 EPI/SOI 등 실리콘 웨이퍼 수급에 미치는 영향',
  );

  // Primary app chart data
  const appChartData = useMemo(() => {
    return VCM_DATA.applicationQuarterlyDemands[primaryApp] ?? [];
  }, [primaryApp]);

  // Secondary app chart data (AI Server when Server category selected)
  const secondaryChartData = useMemo(() => {
    if (!secondaryApp) return undefined;
    return VCM_DATA.applicationQuarterlyDemands[secondaryApp] ?? [];
  }, [secondaryApp]);

  // Device stacked data — combine Traditional + AI for Server category
  const deviceStackedData = useMemo(() => {
    if (isServerCategory) {
      const trad = VCM_DATA.deviceStackedByApp.traditionalServer ?? [];
      const ai = VCM_DATA.deviceStackedByApp.aiServer ?? [];
      return trad.map((t, i): DeviceStackedEntry => {
        const a = ai[i];
        if (!a) return t;
        return {
          ...t,
          dram: t.dram + a.dram,
          hbm: t.hbm + a.hbm,
          nand: t.nand + a.nand,
          otherMemory: t.otherMemory + a.otherMemory,
          logic: t.logic + a.logic,
          analog: t.analog + a.analog,
          discrete: t.discrete + a.discrete,
          sensor: t.sensor + a.sensor,
        };
      });
    }
    return VCM_DATA.deviceStackedByApp[primaryApp] ?? [];
  }, [isServerCategory, primaryApp]);

  // Mount per unit data for table (대당 탑재량) — with color and group for interleaved rendering
  const mountTableData = useMemo(() => {
    const qmu = VCM_DATA.quarterlyMountPerUnit;
    if (!qmu) return [];
    if (isServerCategory) {
      return [
        { label: 'Trad. 탑재량', data: qmu.traditionalServer ?? [], color: APP_COLORS.server, group: 'primary' as const },
        { label: 'AI 탑재량', data: qmu.aiServer ?? [], color: '#8b5cf6', group: 'secondary' as const },
      ];
    }
    const appMount = qmu[primaryApp] ?? [];
    return appMount.length > 0 ? [{ label: '대당 탑재량', data: appMount, color: APP_COLORS[categoryKey] }] : [];
  }, [isServerCategory, primaryApp, categoryKey]);

  const totalWaferQuarterly = VCM_DATA.totalWaferQuarterly;

  function selectCategory(index: number) {
    setAppCategories((prev) =>
      prev.map((item, i) => ({ ...item, checked: i === index })),
    );
  }

  function toggleDevice(index: number) {
    setDeviceFilters((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)),
    );
  }

  return (
    <div className="flex h-full flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      {/* ===== MAIN: Left (Total) | Right (App Detail) — symmetric ===== */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT COLUMN: Total Wafer */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Total Wafer 수요 추이
            </p>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {VCM_DATA.versions.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Total Wafer Line Chart (includes table inside card) */}
          <TotalWaferLineChart
            data={totalWaferQuarterly}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          {/* AI Wafer Demand Analysis */}
          <WaferDemandAnalysis
            data={totalWaferQuarterly}
            articles={waferArticles}
            aiAnswer={waferAnswer}
            loading={waferNewsLoading}
          />
        </div>

        {/* RIGHT COLUMN: App Detail */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto p-4">
          {/* Application Tabs — inside right column */}
          <div className="flex items-center gap-1">
            {appCategories.map((item, i) => (
              <button
                key={item.category}
                onClick={() => selectCategory(i)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  item.checked
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                style={item.checked ? { backgroundColor: APP_COLORS[item.category] } : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* App Demand Bar Chart — with time range, dual bars for Server, mount per unit table */}
          <DemandBarChart
            title={`Application 수요 - ${primaryAppLabel}`}
            data={appChartData}
            barColor={APP_COLORS[categoryKey]}
            barLabel={isServerCategory ? 'Traditional Server' : undefined}
            secondaryData={secondaryChartData}
            secondaryLabel={isServerCategory ? 'AI Server' : undefined}
            secondaryColor="#8b5cf6"
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            mountData={mountTableData}
          />

          {/* AI News Insight + collapsible articles */}
          <InlineNews
            articles={articles}
            answer={answer}
            loading={newsLoading}
            accentColor={APP_COLORS[categoryKey]}
            label={primaryAppLabel}
          />

          {/* Device filter chips — right above device chart */}
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">Device</p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => {
                  const allChecked = deviceFilters.every((f) => f.checked);
                  setDeviceFilters((prev) => prev.map((f) => ({ ...f, checked: !allChecked })));
                }}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  deviceFilters.every((f) => f.checked)
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {deviceFilters.map((item, i) => (
                <button
                  key={item.type}
                  onClick={() => toggleDevice(i)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    item.checked
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device Stacked Bar Chart — with time range */}
          <DeviceStackedChart
            title={`Device別 Wafer 수요 - ${primaryAppLabel}`}
            data={deviceStackedData}
            deviceFilters={deviceFilters}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        </div>
      </div>
    </div>
  );
}
