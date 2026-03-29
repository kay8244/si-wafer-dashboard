import { getDb } from '../src/lib/db';
import {
  SUPPLY_CHAIN_CATEGORIES,
  INTERNAL_COMPANY_DATA,
  OVERLAY_COLORS,
  FOUNDRY_NODES,
  FOUNDRY_NODE_COLORS,
} from '../tests/fixtures/supply-chain-mock';
import { seededValue as seededVal, getRecentMonths } from '../src/lib/data-generation';
import {
  VCM_DATA,
  VCM_VERSIONS,
  NEWS_QUERIES_BY_CATEGORY,
  MOUNT_PER_UNIT_BY_CATEGORY,
  TOTAL_WAFER_YEARLY,
  TOTAL_WAFER_YEARLY_INTERNAL,
  DEVICE_STACKED_YEARLY,
  APP_YEARLY_DEMANDS,
  DEVICE_STACKED_YEARLY_BY_APP,
  TOTAL_WAFER_DEMAND_BY_APP,
  YEARLY_MOUNT_PER_UNIT_BY_CATEGORY,
} from '../tests/fixtures/vcm-mock';
import { CUSTOMER_LIST, CUSTOMER_EXECUTIVES } from '../tests/fixtures/customer-detail-mock';

type Row = {
  tab: string;
  date: string;
  customer: string;
  category: string;
  value: number | null;
  unit: string | null;
  is_estimate: number;
  version: string | null;
  metadata: string | null;
};

function row(
  tab: string,
  date: string,
  customer: string,
  category: string,
  value: number | null,
  unit: string | null,
  is_estimate = 0,
  version: string | null = null,
  metadata: string | null = null,
): Row {
  return { tab, date, customer, category, value, unit, is_estimate, version, metadata };
}

// ── 1. Supply Chain ──────────────────────────────────────────────────────────

function seedSupplyChain(): Row[] {
  const rows: Row[] = [];

  for (const cat of SUPPLY_CHAIN_CATEGORIES) {
    for (const ind of cat.indicators) {
      // Monthly time-series rows
      for (const m of ind.monthly) {
        rows.push(row('supply-chain', m.month, ind.name, 'actual', m.actual, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'threeMonthMA', m.threeMonthMA, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'twelveMonthMA', m.twelveMonthMA, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'mom', m.mom, '%'));
        rows.push(row('supply-chain', m.month, ind.name, 'yoy', m.yoy, '%'));
      }

      // Indicator metadata row
      rows.push(
        row(
          'supply-chain',
          '_meta',
          ind.name,
          'indicatorMeta',
          null,
          ind.unit,
          0,
          null,
          JSON.stringify({
            id: ind.id,
            categoryId: cat.id,
            categoryLabel: cat.label,
            semiAnnualEval: ind.semiAnnualEval,
            judgment: ind.judgment,
            leadingRating: ind.leadingRating,
            ratingReason: ind.ratingReason,
          }),
        ),
      );
    }
  }

  // Internal company data
  for (const [companyId, company] of Object.entries(INTERNAL_COMPANY_DATA)) {
    for (const m of company.metrics.capa) {
      rows.push(row('supply-chain', m.month, companyId, 'internal_capa', m.value, 'M USD'));
    }
    for (const m of company.metrics.waferInput) {
      rows.push(row('supply-chain', m.month, companyId, 'internal_waferInput', m.value, 'pcs'));
    }
    for (const m of company.metrics.utilization) {
      rows.push(row('supply-chain', m.month, companyId, 'internal_utilization', m.value, '%'));
    }
  }

  // Overlay colors
  for (const [companyId, color] of Object.entries(OVERLAY_COLORS)) {
    rows.push(
      row('supply-chain', '_meta', companyId, 'overlayColor', null, null, 0, null, JSON.stringify({ color })),
    );
  }

  return rows;
}

// ── 2. VCM ───────────────────────────────────────────────────────────────────

function seedVcm(version: string, includeCommon = true): Row[] {
  const rows: Row[] = [];

  // Application demands (yearly)
  for (const [appKey, app] of Object.entries(VCM_DATA.applicationDemands)) {
    for (const y of app.yearly) {
      rows.push(
        row(
          'vcm',
          y.year.toString(),
          app.label,
          'appDemand',
          y.value,
          'units',
          y.isEstimate ? 1 : 0,
          version,
          JSON.stringify({ application: appKey }),
        ),
      );
    }
  }

  // Device wafer demands (yearly)
  for (const [, device] of Object.entries(VCM_DATA.deviceWaferDemands)) {
    for (const y of device.yearly) {
      rows.push(
        row(
          'vcm',
          y.year.toString(),
          device.label,
          'deviceWaferDemand',
          y.waferDemand,
          'K/M',
          y.isEstimate ? 1 : 0,
          version,
          JSON.stringify({ device: device.device }),
        ),
      );
    }
  }

  // Mount per unit (yearly)
  for (const entry of VCM_DATA.mountPerUnit) {
    for (const metric of entry.metrics) {
      rows.push(
        row(
          'vcm',
          metric.year.toString(),
          entry.label,
          'mountPerUnit',
          metric.value,
          metric.unit,
          0,
          version,
          JSON.stringify({ serverType: entry.serverType }),
        ),
      );
    }
  }

  // Mount per unit by app
  for (const [appKey, entries] of Object.entries(VCM_DATA.mountPerUnitByApp)) {
    for (const entry of entries) {
      for (const metric of entry.metrics) {
        rows.push(
          row(
            'vcm',
            metric.year.toString(),
            entry.label,
            `mountPerUnitByApp_${appKey}`,
            metric.value,
            metric.unit,
            0,
            version,
            JSON.stringify({ application: appKey, serverType: entry.serverType }),
          ),
        );
      }
    }
  }

  // VCM news
  for (const news of VCM_DATA.news) {
    rows.push(
      row(
        'vcm',
        news.date,
        news.source,
        'vcmNews',
        null,
        null,
        0,
        version,
        JSON.stringify({ title: news.title, summary: news.summary }),
      ),
    );
  }

  // VCM versions (공통 데이터 — version 없이, 한 번만 생성)
  if (includeCommon) {
    for (const v of VCM_VERSIONS) {
      rows.push(
        row(
          'vcm',
          v.date,
          v.id,
          'vcmVersion',
          null,
          null,
          0,
          null,
          JSON.stringify({ label: v.label }),
        ),
      );
    }
  }

  // News queries by category (공통 데이터 — version 없이, 한 번만 생성)
  if (includeCommon) {
    for (const [categoryKey, query] of Object.entries(NEWS_QUERIES_BY_CATEGORY)) {
      rows.push(
        row(
          'vcm',
          '_meta',
          categoryKey,
          'newsQueryByCategory',
          null,
          null,
          0,
          null,
          JSON.stringify({ queryKo: query.queryKo, queryEn: query.queryEn }),
        ),
      );
    }
  }

  // Application table
  for (const entry of VCM_DATA.applicationTable) {
    for (const y of entry.yearly) {
      rows.push(
        row('vcm', y.year.toString(), entry.application, 'applicationTable', y.value, 'units', y.isEstimate ? 1 : 0, version),
      );
    }
  }

  // Mount per unit by category
  for (const [catKey, entries] of Object.entries(MOUNT_PER_UNIT_BY_CATEGORY)) {
    for (const entry of entries) {
      for (const metric of entry.metrics) {
        rows.push(
          row(
            'vcm',
            metric.year.toString(),
            entry.label,
            `mountPerUnitByCategory_${catKey}`,
            metric.value,
            metric.unit,
            0,
            version,
            JSON.stringify({ categoryType: catKey, serverType: entry.serverType }),
          ),
        );
      }
    }
  }

  // News queries (per app — 공통 데이터 — version 없이, 한 번만 생성)
  if (includeCommon) {
    for (const [appKey, query] of Object.entries(VCM_DATA.newsQueries)) {
      rows.push(
        row(
          'vcm',
          '_meta',
          appKey,
          'newsQuery',
          null,
          null,
          0,
          null,
          JSON.stringify({ queryKo: query.queryKo, queryEn: query.queryEn }),
        ),
      );
    }
  }

  return rows;
}

// ── 2b. VCM Yearly ──────────────────────────────────────────────────────────

function seedVcmYearly(version: string, factor: number): Row[] {
  const rows: Row[] = [];
  const f = (v: number) => Math.round(v * factor);

  // 1. TOTAL_WAFER_YEARLY
  for (const entry of TOTAL_WAFER_YEARLY) {
    rows.push(
      row(
        'vcm',
        entry.year.toString(),
        'Total',
        'totalWaferYearly',
        f(entry.total),
        'K/M',
        entry.isEstimate ? 1 : 0,
        version,
        JSON.stringify({ pw: f(entry.pw), epi: f(entry.epi) }),
      ),
    );
  }

  // 1b. TOTAL_WAFER_YEARLY_INTERNAL
  for (const entry of TOTAL_WAFER_YEARLY_INTERNAL) {
    rows.push(
      row(
        'vcm',
        entry.year.toString(),
        'Internal',
        'totalWaferYearly',
        f(entry.total),
        'K/M',
        entry.isEstimate ? 1 : 0,
        version,
        JSON.stringify({ pw: f(entry.pw), epi: f(entry.epi) }),
      ),
    );
  }

  // 2. DEVICE_STACKED_YEARLY
  for (const entry of DEVICE_STACKED_YEARLY) {
    rows.push(
      row(
        'vcm',
        entry.year.toString(),
        'All',
        'deviceStackedYearly',
        null,
        'K/M',
        entry.isEstimate ? 1 : 0,
        version,
        JSON.stringify({
          dram: f(entry.dram), hbm: f(entry.hbm), nand: f(entry.nand),
          otherMemory: f(entry.otherMemory), logic: f(entry.logic),
          analog: f(entry.analog), discrete: f(entry.discrete), sensor: f(entry.sensor),
        }),
      ),
    );
  }

  // 3. APP_YEARLY_DEMANDS
  for (const [appKey, values] of Object.entries(APP_YEARLY_DEMANDS)) {
    for (const v of values) {
      rows.push(
        row(
          'vcm',
          v.year.toString(),
          appKey,
          'appYearlyDemand',
          f(v.value),
          'units',
          v.isEstimate ? 1 : 0,
          version,
        ),
      );
    }
  }

  // 4. DEVICE_STACKED_YEARLY_BY_APP
  for (const [appKey, entries] of Object.entries(DEVICE_STACKED_YEARLY_BY_APP)) {
    for (const entry of entries) {
      rows.push(
        row(
          'vcm',
          entry.year.toString(),
          appKey,
          'deviceStackedYearlyByApp',
          null,
          'K/M',
          entry.isEstimate ? 1 : 0,
          version,
          JSON.stringify({
            dram: f(entry.dram), hbm: f(entry.hbm), nand: f(entry.nand),
            otherMemory: f(entry.otherMemory), logic: f(entry.logic),
            analog: f(entry.analog), discrete: f(entry.discrete), sensor: f(entry.sensor),
          }),
        ),
      );
    }
  }

  // 5. TOTAL_WAFER_DEMAND_BY_APP (yearly total wafer demand per app)
  for (const [appKey, totals] of Object.entries(TOTAL_WAFER_DEMAND_BY_APP)) {
    for (const t of totals) {
      rows.push(
        row(
          'vcm',
          t.year.toString(),
          appKey,
          'totalWaferDemandByAppYearly',
          f(t.total),
          'K/M',
          t.isEstimate ? 1 : 0,
          version,
        ),
      );
    }
  }

  // 6. YEARLY_MOUNT_PER_UNIT_BY_CATEGORY
  for (const [catKey, entries] of Object.entries(YEARLY_MOUNT_PER_UNIT_BY_CATEGORY)) {
    for (const entry of entries) {
      for (const metric of entry.metrics) {
        rows.push(
          row(
            'vcm',
            metric.year.toString(),
            entry.label,
            'yearlyMountPerUnitByCategory',
            f(metric.value),
            metric.unit,
            0,
            version,
            JSON.stringify({ categoryType: catKey, serverType: entry.serverType }),
          ),
        );
      }
    }
  }

  return rows;
}

// ── 3. Customer Detail ───────────────────────────────────────────────────────

function seedCustomerDetail(): Row[] {
  const rows: Row[] = [];

  // Customer list metadata
  for (const cust of CUSTOMER_LIST) {
    rows.push(
      row(
        'customer-detail',
        '_meta',
        cust.id,
        'customerList',
        null,
        null,
        0,
        null,
        JSON.stringify({ label: cust.label, type: cust.type, subLabel: cust.subLabel }),
      ),
    );
  }

  for (const [custId, exec] of Object.entries(CUSTOMER_EXECUTIVES)) {
    // Basic customer meta
    rows.push(
      row(
        'customer-detail',
        '_meta',
        custId,
        'customerMeta',
        null,
        null,
        0,
        null,
        JSON.stringify({
          label: exec.label,
          type: exec.type,
          newsQueryKo: exec.newsQueryKo,
          newsQueryEn: exec.newsQueryEn,
          foundryData: exec.foundryData,
          mktInfo: exec.mktInfo,
          versionLabel: exec.versionLabel,
          prevVersionLabel: exec.prevVersionLabel,
        }),
      ),
    );

    // KPI metrics
    for (const kpi of exec.kpiMetrics) {
      const val = parseFloat(kpi.value);
      rows.push(
        row('customer-detail', '_kpi', custId, `kpiMetric_${kpi.label}`, isNaN(val) ? null : val, kpi.unit ?? null),
      );
    }

    // Configurable KPIs
    for (const kpi of exec.configurableKpis) {
      const val = parseFloat(kpi.value);
      rows.push(
        row(
          'customer-detail',
          '_kpi',
          custId,
          `configurableKpi_${kpi.id}`,
          isNaN(val) ? null : val,
          kpi.unit,
          0,
          null,
          JSON.stringify({ label: kpi.label, trend: kpi.trend, trendValue: kpi.trendValue }),
        ),
      );
    }

    // Product mix
    for (const item of exec.productMix) {
      rows.push(
        row(
          'customer-detail',
          '_mix',
          custId,
          `productMix_${item.category}`,
          item.percentage,
          '%',
          0,
          null,
          JSON.stringify({ color: item.color }),
        ),
      );
    }

    // Product mix trend
    for (const trend of exec.productMixTrend) {
      for (const [catName, catValue] of Object.entries(trend.values)) {
        rows.push(
          row('customer-detail', trend.quarter, custId, `productMixTrend_${catName}`, catValue as number, '%'),
        );
      }
    }

    // Wafer input (5 quarters)
    for (const wi of exec.waferInput) {
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_km2', wi.km2, 'Km'));
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_km', wi.km, 'Km'));
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_kpcs', wi.kpcs, 'Kpcs'));
    }

    // Monthly metrics (current version)
    for (const m of exec.monthlyMetrics) {
      rows.push(row('customer-detail', m.month, custId, 'monthly_waferInput', m.waferInput, 'Km', 0, 'current'));
      rows.push(row('customer-detail', m.month, custId, 'monthly_purchaseVolume', m.purchaseVolume, 'Km', 0, 'current'));
      rows.push(row('customer-detail', m.month, custId, 'monthly_inventoryMonths', m.inventoryMonths, 'months', 0, 'current'));
      rows.push(row('customer-detail', m.month, custId, 'monthly_utilization', m.utilization, '%', 0, 'current'));
      rows.push(row('customer-detail', m.month, custId, 'monthly_inventoryLevel', m.inventoryLevel, 'months', 0, 'current'));
      rows.push(row('customer-detail', m.month, custId, 'monthly_capa', m.capa, 'Km', 0, 'current'));
      if (m.dramRatio !== undefined) {
        rows.push(row('customer-detail', m.month, custId, 'monthly_dramRatio', m.dramRatio, 'ratio', 0, 'current'));
      }
    }

    // Monthly metrics (previous version)
    if (exec.monthlyMetricsPrev) {
      for (const m of exec.monthlyMetricsPrev) {
        rows.push(row('customer-detail', m.month, custId, 'monthly_waferInput', m.waferInput, 'Km', 0, 'previous'));
        rows.push(row('customer-detail', m.month, custId, 'monthly_purchaseVolume', m.purchaseVolume, 'Km', 0, 'previous'));
        rows.push(row('customer-detail', m.month, custId, 'monthly_inventoryMonths', m.inventoryMonths, 'months', 0, 'previous'));
        rows.push(row('customer-detail', m.month, custId, 'monthly_utilization', m.utilization, '%', 0, 'previous'));
        rows.push(row('customer-detail', m.month, custId, 'monthly_inventoryLevel', m.inventoryLevel, 'months', 0, 'previous'));
        rows.push(row('customer-detail', m.month, custId, 'monthly_capa', m.capa, 'Km', 0, 'previous'));
        if (m.dramRatio !== undefined) {
          rows.push(row('customer-detail', m.month, custId, 'monthly_dramRatio', m.dramRatio, 'ratio', 0, 'previous'));
        }
      }
    }

    // Quarterly wafer in/out (18 quarters)
    for (const q of exec.waferInOutQuarterly) {
      const est = q.isEstimate ? 1 : 0;
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_waferIn', q.waferIn, 'K/M', est));
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_waferOut', q.waferOut, 'K/M', est));
      if (q.dramRatio !== undefined) {
        rows.push(row('customer-detail', q.quarter, custId, 'quarterly_dramRatio', q.dramRatio, 'ratio', est));
      }
    }

    // Bit growth quarterly
    for (const q of exec.bitGrowthQuarterly) {
      const est = q.isEstimate ? 1 : 0;
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_bitGrowth', q.growth, '%', est));
      if (q.growthTF !== undefined) {
        rows.push(row('customer-detail', q.quarter, custId, 'quarterly_bitGrowthTF', q.growthTF, '%', est));
      }
    }

    // Estimate trend
    if (exec.estimateTrend) {
      const trend = exec.estimateTrend;
      const targetMeta = JSON.stringify({ targetYear: trend.targetYear });
      for (const point of trend.ubs) {
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_ubs_waferIn', point.waferIn, 'Km', 0, null, targetMeta));
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_ubs_waferOut', point.waferOut, 'Km'));
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_ubs_bitGrowth', point.bitGrowth, '%'));
        if (point.dramRatio !== undefined) {
          rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_ubs_dramRatio', point.dramRatio, 'ratio'));
        }
      }
      for (const point of trend.trendforce) {
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_tf_waferIn', point.waferIn, 'Km', 0, null, targetMeta));
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_tf_waferOut', point.waferOut, 'Km'));
        rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_tf_bitGrowth', point.bitGrowth, '%'));
        if (point.dramRatio !== undefined) {
          rows.push(row('customer-detail', point.reportDate, custId, 'estimateTrend_tf_dramRatio', point.dramRatio, 'ratio'));
        }
      }
    }

    // Scrap rate
    for (const sr of exec.scrapRate) {
      rows.push(
        row(
          'customer-detail',
          '_static',
          custId,
          `scrapRate_${sr.label}`,
          sr.internal,
          '%',
          0,
          null,
          JSON.stringify({ external: sr.external }),
        ),
      );
    }

    // External comparison
    for (const ec of exec.externalComparison) {
      rows.push(
        row(
          'customer-detail',
          '_static',
          custId,
          `externalComparison_${ec.source}`,
          null,
          null,
          0,
          null,
          JSON.stringify({ waferBitOut: ec.waferBitOut, bitGrowth: ec.bitGrowth, gap: ec.gap }),
        ),
      );
    }

    // News
    for (const news of exec.news) {
      rows.push(
        row(
          'customer-detail',
          news.date,
          custId,
          'news',
          null,
          null,
          0,
          null,
          JSON.stringify({ source: news.source, title: news.title, categories: news.categories }),
        ),
      );
    }

    // Weekly summary
    if (exec.weeklySummary) {
      const ws = exec.weeklySummary;
      rows.push(
        row(
          'customer-detail',
          '_weekly',
          custId,
          'weeklySummary',
          null,
          null,
          0,
          null,
          JSON.stringify({ weekLabel: ws.weekLabel, comment: ws.comment }),
        ),
      );
    }

    // Financial data (mock quarterly revenue & operating income)
    const FINANCIAL_QUARTERS = [
      '4Q21', '1Q22', '2Q22', '3Q22', '4Q22',
      '1Q23', '2Q23', '3Q23', '4Q23',
      '1Q24', '2Q24', '3Q24', '4Q24',
      '1Q25', '2Q25', '3Q25', '4Q25',
    ];
    // Base values per customer — local currency, Million (M)
    const FINANCIAL_BASE: Record<string, { rev: number; oi: number }> = {
      SEC:         { rev: 78000000, oi: 15000000 },  // ₩M (4Q25 기준 ≈100조원 매출, ≈20조원 영업이익)
      SKHynix:     { rev: 13000000, oi: 3500000 },   // ₩M (≈13조원/Q)
      Micron:      { rev:     8100, oi:    1800 },    // $M (~$8.1B/Q)
      Koxia:       { rev:   500000, oi:   60000 },    // ¥M (≈5000億円/Q)
      SEC_Foundry: { rev:  5500000, oi:  500000 },    // ₩M (≈5.5조원/Q)
      TSMC:        { rev:   680000, oi:  300000 },    // NT$M (≈NT$680B/Q)
      SMC:         { rev:    13000, oi:    1300 },    // CN¥M (≈CN¥13B/Q)
      GFS:         { rev:     1850, oi:     200 },    // $M (~$1.85B/Q)
      STM:         { rev:     4100, oi:     700 },    // €M (~€4.1B/Q)
      Intel:       { rev:    13500, oi:    1200 },    // $M (~$13.5B/Q)
      Total_DRAM_NAND: { rev: 43800, oi: 12500 },    // $M (aggregate)
      Total_Foundry:   { rev: 31500, oi: 10400 },    // $M (aggregate)
    };
    const base = FINANCIAL_BASE[custId];
    if (base) {
      FINANCIAL_QUARTERS.forEach((q, i) => {
        // Deterministic seasonal variation: semiconductor cycle
        const cycleFactor = 1 + 0.12 * Math.sin((i / 14) * Math.PI * 2.5);
        const growthFactor = 1 + i * 0.015;
        const rev = Math.round(base.rev * cycleFactor * growthFactor);
        const oi = Math.round(base.oi * cycleFactor * cycleFactor * growthFactor);
        rows.push(row('customer-detail', q, custId, 'financial_revenue', rev, '$M'));
        rows.push(row('customer-detail', q, custId, 'financial_operatingIncome', oi, '$M'));
      });
    }

    // Transcript summary (4Q24 conference call)
    const TRANSCRIPT_SUMMARIES: Record<string, string> = {
      SEC: '삼성전자는 4Q24 실적발표에서 메모리 반도체 수요 회복세를 확인하며 HBM3E 양산 확대 계획을 발표했습니다. DRAM 평균판매가(ASP)는 전분기 대비 8% 상승하였으며, NAND 재고는 정상화 수준에 근접했다고 밝혔습니다. 2025년 상반기 선단 공정(1b nm) 전환 가속화를 통해 원가 경쟁력 강화에 집중할 예정이며, AI 서버향 고부가 제품 비중을 30% 이상으로 확대할 계획입니다.',
      SKHynix: 'SK하이닉스는 4Q24 어닝콜에서 HBM3E 12단 양산 성공 및 주요 AI 고객사 공급 확대를 발표했습니다. 전체 매출의 40% 이상이 HBM 및 고부가 DRAM에서 발생하며 수익성이 크게 개선되었습니다. 1c nm DRAM 개발이 순조롭게 진행 중이며, 2025년 HBM 캐파를 전년 대비 2배 이상 확대할 예정입니다. NAND 사업부는 238단 제품 전환을 완료하고 수익성 중심 판매 전략을 유지한다고 강조했습니다.',
      Micron: 'Micron은 4Q24 실적발표에서 DRAM 및 NAND 수요가 AI 서버 중심으로 강하게 회복되고 있음을 확인했습니다. HBM3E 생산 능력을 지속 확충하며 주요 AI 고객사 인증을 완료했다고 밝혔습니다. NAND 측면에서는 232단 QLC 제품 전환을 가속화하여 데이터센터 SSD 시장에서 점유율을 확대할 계획입니다. 2025년 Capex는 AI 수요 대응을 위한 선단 공정 투자에 집중될 예정입니다.',
      Koxia: 'Kioxia는 4Q24 결산 설명회에서 NAND 수요 회복에 따른 가동률 개선과 재고 정상화 진행 상황을 공유했습니다. 232단 TLC/QLC 전환이 90% 이상 완료되었으며, 데이터센터 및 엔터프라이즈 SSD 수주가 확대되고 있습니다. WD와의 합작법인 구조 내에서 BiCS 7세대(294단) 개발이 순조롭게 진행 중이며, 2025년 하반기 양산을 목표로 하고 있습니다.',
      SEC_Foundry: '삼성 파운드리는 4Q24 어닝콜에서 2nm GAA 공정 수율 개선이 계획 대비 순조롭다고 밝혔습니다. AI 가속기 및 모바일 AP 고객사의 수주 잔고가 증가하고 있으며, 2025년 선단 공정 매출 비중을 40% 이상으로 확대할 계획입니다. 테일러 팹(Texas) 가동 준비가 완료 단계에 있으며, 미국 고객사 공급을 위한 인프라 확충이 완료되었습니다.',
      TSMC: 'TSMC는 4Q24 실적에서 사상 최대 매출을 기록하며 AI 반도체 수요의 강한 성장을 재확인했습니다. CoWoS 패키징 캐파는 2025년 전년 대비 두 배 이상 확대될 예정이며, N3E 공정 수율이 80%를 상회한다고 밝혔습니다. 2nm 공정(N2)은 2025년 하반기 양산을 목표로 하며, Apple·NVIDIA·AMD 등 주요 고객사 수요가 집중되고 있습니다. 2025년 Capex 가이던스는 $380억~$420억으로 역대 최대 수준입니다.',
      SMC: 'SMIC는 4Q24 실적발표에서 성숙 공정(28nm 이상) 중심의 가동률 회복세를 보고했습니다. 자동차·IoT·산업용 반도체 수요가 견조하게 회복되며 가동률이 전분기 대비 5%p 상승했습니다. 14nm 이하 선단 공정 개발은 장비 조달 제한 속에서도 점진적으로 진행 중이라고 밝혔습니다.',
      GFS: 'GlobalFoundries는 4Q24 어닝콜에서 자동차 및 통신 반도체 수요 회복에 따른 수주 증가를 발표했습니다. 22FDX 및 12LP+ 공정에서의 고객 설계 승인(PDK qualification)이 확대되고 있으며, 장기 공급 계약(LTA) 비중이 80%를 상회한다고 밝혔습니다. 2025년 중반 몰타 팹 추가 캐파 가동이 예정되어 있으며, 운영 마진 개선에 집중할 계획입니다.',
      STM: 'STMicroelectronics는 4Q24 실적발표에서 SiC 전력반도체 수요 확대에 따른 자동차향 매출 성장을 강조했습니다. Tesla 및 유럽 주요 OEM 향 공급이 지속 확대되며 SiC 시장 점유율 2위를 유지하고 있습니다. 300mm 팹 전환 투자를 통해 2026년 원가 구조 개선 효과가 가시화될 전망이며, MCU 및 아날로그 제품 수요도 점진적 회복세를 보이고 있습니다.',
      Intel: 'Intel Foundry는 4Q24에서 외부 고객 수주 확대 및 18A 공정 수율 개선 현황을 공유했습니다. Microsoft·Qualcomm 등 주요 고객사의 18A 테이프아웃이 진행 중이며, Intel 자체 Panther Lake 제품의 수율이 양산 기준을 충족하고 있다고 밝혔습니다. 파운드리 사업부 분리 구조 전환 후 첫 독립 실적을 발표하며 2026년 손익분기점 달성 목표를 재확인했습니다.',
      Total_DRAM_NAND: '4Q24 메모리 산업 합산 기준으로 DRAM ASP는 전분기 대비 7~10% 상승하였으며, NAND 공급 과잉이 완화되며 가격 반등이 시작되었습니다. HBM 수요는 AI 인프라 투자 확대와 함께 빠르게 성장 중이며, 2025년 HBM 시장 규모는 전년 대비 2배 이상 확대될 전망입니다. 업계 전반적으로 재고 정상화가 완료됨에 따라 2025년 상반기 출하량 증가와 수익성 개선이 기대됩니다.',
      Total_Foundry: '4Q24 파운드리 업계 합산 기준으로 선단 공정 가동률이 90%를 상회하며 AI 반도체 수요 집중 현상이 뚜렷하게 나타났습니다. 2nm 이하 공정 경쟁이 본격화되는 가운데 TSMC의 기술 선도와 삼성 파운드리의 추격이 가속화되고 있습니다. 성숙 공정(28nm 이상) 분야는 자동차·산업용 수요 회복으로 가동률이 점진적으로 개선 중이며, 2025년 전체 파운드리 시장은 전년 대비 15~18% 성장이 전망됩니다.',
    };

    const summary = TRANSCRIPT_SUMMARIES[custId];
    if (summary) {
      rows.push(
        row(
          'customer-detail',
          '4Q24',
          custId,
          'transcript',
          null,
          null,
          0,
          null,
          JSON.stringify({
            summary,
            excelUrl: `/files/transcript-${custId}-4Q24.xlsx`,
            pdfUrl: `https://example.com/transcript-${custId}-4Q24.pdf`,
          }),
        ),
      );
    }
  }

  return rows;
}

// ── 4. Industry Metrics ───────────────────────────────────────────────────────

function seededValue(base: number, spread: number, seed: number): number {
  // Deterministic pseudo-random: sin-based hash
  const h = Math.sin(seed * 9301 + 49297) * 233280;
  const r = h - Math.floor(h);
  return Math.round((base + (r - 0.5) * spread * 2) * 10) / 10;
}

function seedIndustryMetrics(): Row[] {
  const rows: Row[] = [];

  // ── Memory customers: HBM Bit growth (%), quarterly, 8 quarters ────────────
  const HBM_QUARTERS = ['1Q24', '2Q24', '3Q24', '4Q24', '1Q25', '2Q25', '3Q25', '4Q25', '1Q26', '2Q26', '3Q26', '4Q26'];
  const HBM_CONFIG: Record<string, { base: number; spread: number }> = {
    SEC:     { base: 20, spread: 5 },
    SKHynix: { base: 25, spread: 5 },
    Micron:  { base: 15, spread: 5 },
    Koxia:   { base: 10, spread: 5 },
  };

  for (const [custId, cfg] of Object.entries(HBM_CONFIG)) {
    HBM_QUARTERS.forEach((q, i) => {
      rows.push(row(
        'customer-detail', q, custId, 'industry_metric',
        seededValue(cfg.base, cfg.spread, i + custId.charCodeAt(0)),
        '%', 0, null,
        JSON.stringify({ metricId: 'hbm_bit_growth', name: 'HBM Bit growth', period: 'quarterly' }),
      ));
    });
  }

  // ── Non-memory customers: foundry utilization metrics ──────────────────────
  const MONTHS_12 = [
    '25.01','25.02','25.03','25.04','25.05','25.06',
    '25.07','25.08','25.09','25.10','25.11','25.12',
  ];

  // Helper: emit monthly rows for a given customer + metric
  function addUtilMetric(
    custId: string,
    metricId: string,
    name: string,
    tooltip: string | undefined,
    base: number,
    spread: number,
    unit: string,
    seedOffset: number,
  ) {
    MONTHS_12.forEach((m, i) => {
      rows.push(row(
        'customer-detail', m, custId, 'industry_metric',
        seededValue(base, spread, i + seedOffset),
        unit, 0, null,
        JSON.stringify({
          metricId,
          name,
          ...(tooltip ? { tooltip } : {}),
          period: 'monthly',
        }),
      ));
    });
  }

  // SEC (파운드리) — SEC_Foundry maps to "SEC" in foundry context,
  // but the actual customer IDs for foundry are SEC_Foundry, TSMC, SMC, GFS, STM, Intel
  // Per spec: SEC non-memory = SEC_Foundry? No — spec says "SEC: TSMC 비선단..." which is the
  // foundry customer view of SEC (fab usage of SEC products). Looking at IDs, foundry customers
  // are: SEC_Foundry, TSMC, SMC, GFS, STM, Intel. The spec lists "SEC" as a non-memory customer.
  // SEC_Foundry is Samsung's foundry division. We'll map per spec names to their IDs:
  // "SEC" non-memory → SEC_Foundry, "SMIC(SMC)" → SMC

  const S = 100; // base seed multiplier per customer

  // SEC_Foundry: TSMC 비선단, TSMC 선단, UMC 비선단
  addUtilMetric('SEC_Foundry', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 84, 4, '%', 1*S);
  addUtilMetric('SEC_Foundry', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 90, 5, '%', 2*S);
  addUtilMetric('SEC_Foundry', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 70, 5, '%', 3*S);

  // SMC: TSMC 비선단, UMC 비선단
  addUtilMetric('SMC', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 82, 4, '%', 4*S);
  addUtilMetric('SMC', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 68, 5, '%', 5*S);

  // TSMC: TSMC 비선단, TSMC 선단, UMC 비선단
  addUtilMetric('TSMC', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 85, 3, '%', 6*S);
  addUtilMetric('TSMC', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 92, 4, '%', 7*S);
  addUtilMetric('TSMC', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 72, 5, '%', 8*S);

  // GFS: TSMC 비선단, UMC 비선단
  addUtilMetric('GFS', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 81, 4, '%', 9*S);
  addUtilMetric('GFS', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 67, 5, '%', 10*S);

  // STM: Auto 출하량, Analog 매출액, Analog 수량, MCU 매출액, MCU 수량
  addUtilMetric('STM', 'auto_shipment', 'Auto 출하량', undefined, 1000, 200, 'M units', 11*S);
  addUtilMetric('STM', 'analog_revenue', 'Analog 매출액', undefined, 3500, 1000, '$M', 12*S);
  addUtilMetric('STM', 'analog_volume', 'Analog 수량', undefined, 8000, 2000, 'M units', 13*S);
  addUtilMetric('STM', 'mcu_revenue', 'MCU 매출액', undefined, 2800, 800, '$M', 14*S);
  addUtilMetric('STM', 'mcu_volume', 'MCU 수량', undefined, 6500, 1500, 'M units', 15*S);

  // Intel: TSMC 선단, MPU 매출액, MPU 수량
  addUtilMetric('Intel', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 88, 5, '%', 16*S);
  addUtilMetric('Intel', 'mpu_revenue', 'MPU 매출액', undefined, 4200, 1200, '$M', 17*S);
  addUtilMetric('Intel', 'mpu_volume', 'MPU 수량', undefined, 9000, 2500, 'M units', 18*S);

  return rows;
}

// ── 5. Foundry Nodes ────────────────────────────────────────────────────────

function seedFoundryNodes(): Row[] {
  const rows: Row[] = [];

  for (const [company, nodes] of Object.entries(FOUNDRY_NODES)) {
    for (const node of nodes) {
      const nodeCustomer = `${company}_${node.id}`;
      for (const m of node.monthly) {
        rows.push(
          row(
            'supply-chain',
            m.month,
            nodeCustomer,
            'foundry_node',
            m.waferInput,
            'K/M',
            0,
            company,
            JSON.stringify({
              capa: m.capa,
              nodeId: node.id,
              nodeLabel: node.label,
              category: node.category,
            }),
          ),
        );
      }
    }
  }

  // Foundry node colors
  for (const [nodeId, color] of Object.entries(FOUNDRY_NODE_COLORS)) {
    rows.push(
      row('supply-chain', '_meta', nodeId, 'foundry_node_color', null, null, 0, color),
    );
  }

  return rows;
}

// ── 6. Server Leading Indicators ────────────────────────────────────────────

function seedServerIndicators(): Row[] {
  const rows: Row[] = [];

  const FULL_MONTHS = 36;
  const ALL_MONTHS = getRecentMonths(FULL_MONTHS);

  function genYoYSeries(baseTrend: number, volatility: number, seed: number): { month: string; value: number }[] {
    const totalLen = FULL_MONTHS + 12;
    const raw: number[] = [];
    for (let i = 0; i < totalLen; i++) {
      const progress = i / (totalLen - 1);
      const trend = 100 + baseTrend * progress;
      const noise = (seededVal(seed + i * 7) - 0.5) * 2 * volatility;
      raw.push(trend + noise);
    }
    const ma12: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      if (i < 11) { ma12.push(raw[i]); continue; }
      ma12.push(raw.slice(i - 11, i + 1).reduce((a, b) => a + b, 0) / 12);
    }
    return ALL_MONTHS.map((month, i) => {
      const idx = i + 12;
      const curr = ma12[idx];
      const prev = ma12[idx - 12];
      const yoy = prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
      return { month, value: +yoy.toFixed(1) };
    });
  }

  const INDICATORS = [
    { id: 'srv_sales', group: '서버판매량', subGroup: '', company: '', data: genYoYSeries(8, 12, 801) },
    { id: 'dc_construction', group: '서버\n구매자 투자', subGroup: '미 Data\nCenter', company: 'DC 건설지출', data: genYoYSeries(20, 8, 811) },
    { id: 'dc_power', group: '서버\n구매자 투자', subGroup: '미 Data\nCenter', company: 'DC 집중지역\n전력 소비량', data: genYoYSeries(15, 6, 812) },
    { id: 'wistron', group: '서버 공급자', subGroup: '서버\nODM', company: 'Wistron', data: genYoYSeries(-5, 15, 821) },
    { id: 'wlwynn', group: '서버 공급자', subGroup: '서버\nODM', company: 'Wlwynn', data: genYoYSeries(25, 18, 822) },
    { id: 'quanta', group: '서버 공급자', subGroup: '서버\nODM', company: 'Quanta', data: genYoYSeries(-3, 12, 823) },
    { id: 'inventec', group: '서버 공급자', subGroup: '서버\nODM', company: 'Inventec', data: genYoYSeries(-8, 10, 824) },
    { id: 'kinsus', group: '핵심 부품\n공급자', subGroup: 'ABF', company: 'Kinsus', data: genYoYSeries(10, 14, 831) },
    { id: 'unimicron', group: '핵심 부품\n공급자', subGroup: 'ABF', company: 'Unimicron', data: genYoYSeries(-4, 12, 832) },
    { id: 'isupt', group: '핵심 부품\n공급자', subGroup: 'MLB', company: '이수페타시스', data: genYoYSeries(18, 16, 833) },
    { id: 'doosan', group: '핵심 부품\n공급자', subGroup: 'CCL', company: '두산', data: genYoYSeries(-6, 10, 834) },
    { id: 'tw3', group: '핵심 부품\n공급자', subGroup: 'CCL', company: '대만 3사', data: genYoYSeries(-2, 8, 835) },
    { id: 'aspeed', group: '핵심 부품\n공급자', subGroup: 'BMC', company: 'Aspeed', data: genYoYSeries(30, 20, 836) },
    { id: 'avc', group: '핵심 부품\n공급자', subGroup: 'Cooling', company: 'AVC', data: genYoYSeries(-10, 8, 837) },
  ];

  for (const ind of INDICATORS) {
    const displayName = ind.company || ind.group;
    for (const d of ind.data) {
      rows.push(
        row(
          'supply-chain',
          d.month,
          ind.id,
          'server_indicator',
          d.value,
          '%',
          0,
          displayName,
          JSON.stringify({ group: ind.group, subGroup: ind.subGroup, company: ind.company }),
        ),
      );
    }
  }

  return rows;
}

// ── 7. Memory Price Indicators ──────────────────────────────────────────────

function seedMemoryPriceIndicators(): Row[] {
  const rows: Row[] = [];

  const FULL_MONTHS = 36;
  const ALL_MONTHS = getRecentMonths(FULL_MONTHS);

  function genPriceSeries(basePrice: number, trend: number, volatility: number, seed: number): { month: string; value: number }[] {
    return ALL_MONTHS.map((month, i) => {
      const progress = i / (FULL_MONTHS - 1);
      const trendVal = basePrice + trend * progress;
      const noise = (seededVal(seed + i * 7) - 0.5) * 2 * volatility;
      return { month, value: +(trendVal + noise).toFixed(2) };
    });
  }

  const INDICATORS = [
    { id: 'ddr4_8g_pc', name: '8GB DDR4 DIMM (PC)', unit: '$', data: genPriceSeries(1.85, -0.3, 0.08, 901) },
    { id: 'ddr4_16g_pc', name: '16GB DDR4 DIMM (PC)', unit: '$', data: genPriceSeries(3.50, -0.5, 0.15, 902) },
    { id: 'ddr4_32g_srv', name: '32GB DDR4 RDIMM (SERVER)', unit: '$', data: genPriceSeries(6.80, -0.8, 0.25, 903) },
    { id: 'lpddr4_8g', name: '8GB LPDDR4 (SMP)', unit: '$', data: genPriceSeries(2.10, -0.2, 0.10, 904) },
    { id: 'lpddr4_12g', name: '12GB LPDDR4 (SMP)', unit: '$', data: genPriceSeries(3.15, -0.3, 0.12, 905) },
    { id: 'ddr5_16g', name: '16GB DDR5 DIMM', unit: '$', data: genPriceSeries(4.20, 0.5, 0.18, 906) },
    { id: 'ddr5_64g', name: '64GB DDR5 RDIMM', unit: '$', data: genPriceSeries(12.50, 1.5, 0.50, 907) },
    { id: 'ddr5_96g_srv', name: '96GB DDR5 RDIMM (SERVER)', unit: '$', data: genPriceSeries(18.00, 2.0, 0.80, 908) },
    { id: 'ddr5_128g_srv', name: '128GB DDR5 RDIMM (SERVER)', unit: '$', data: genPriceSeries(24.50, 3.0, 1.20, 909) },
    { id: 'ddr5_256g_srv', name: '256GB DDR5 RDIMM (SERVER)', unit: '$', data: genPriceSeries(48.00, 5.0, 2.50, 910) },
    { id: 'lpddr5_8g', name: '8GB LPDDR5 (SMP)', unit: '$', data: genPriceSeries(3.80, 0.3, 0.15, 911) },
    { id: 'lpddr5_12g', name: '12GB LPDDR5 (SMP)', unit: '$', data: genPriceSeries(5.50, 0.4, 0.20, 912) },
    { id: 'nand_256g_tlc', name: 'NAND Price 256Gb TLC Wafer', unit: '$', data: genPriceSeries(1.20, 0.3, 0.08, 921) },
    { id: 'nand_512g_tlc', name: 'NAND Price 512Gb TLC Wafer', unit: '$', data: genPriceSeries(2.10, 0.5, 0.12, 922) },
    { id: 'nand_1t_qlc', name: 'NAND Price 1Tb QLC Wafer', unit: '$', data: genPriceSeries(1.80, 0.2, 0.10, 923) },
  ];

  for (const ind of INDICATORS) {
    for (const d of ind.data) {
      rows.push(
        row(
          'supply-chain',
          d.month,
          ind.id,
          'memory_price',
          d.value,
          ind.unit,
          0,
          ind.name,
        ),
      );
    }
  }

  return rows;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const db = getDb();

  // Clear existing data (preserve transcript cache)
  db.exec("DELETE FROM metrics WHERE tab != 'transcript-cache'");

  const insert = db.prepare(`
    INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, version, metadata)
    VALUES (@tab, @date, @customer, @category, @value, @unit, @is_estimate, @version, @metadata)
  `);

  const insertMany = db.transaction((rows: Row[]) => {
    for (const r of rows) {
      insert.run(r);
    }
  });

  // Supply Chain
  process.stdout.write('Seeding supply-chain...');
  const scRows = seedSupplyChain();
  insertMany(scRows);
  console.log(` ${scRows.length} rows`);

  // VCM (2025-04: 원본)
  process.stdout.write('Seeding vcm (2025-04)...');
  const vcmRows1 = seedVcm('2025-04', true);
  insertMany(vcmRows1);
  console.log(` ${vcmRows1.length} rows`);

  process.stdout.write('Seeding vcm-yearly (2025-04)...');
  const vcmYearlyRows1 = seedVcmYearly('2025-04', 1.0);
  insertMany(vcmYearlyRows1);
  console.log(` ${vcmYearlyRows1.length} rows`);

  // VCM (2025-10: 3% 상향 조정)
  process.stdout.write('Seeding vcm (2025-10)...');
  const vcmRows2 = seedVcm('2025-10', false);
  insertMany(vcmRows2);
  console.log(` ${vcmRows2.length} rows`);

  process.stdout.write('Seeding vcm-yearly (2025-10)...');
  const vcmYearlyRows2 = seedVcmYearly('2025-10', 1.03);
  insertMany(vcmYearlyRows2);
  console.log(` ${vcmYearlyRows2.length} rows`);

  // Customer Detail
  process.stdout.write('Seeding customer-detail...');
  const cdRows = seedCustomerDetail();
  insertMany(cdRows);
  console.log(` ${cdRows.length} rows`);

  // Industry Metrics
  process.stdout.write('Seeding industry-metrics...');
  const imRows = seedIndustryMetrics();
  insertMany(imRows);
  console.log(` ${imRows.length} rows`);

  // Foundry Nodes
  process.stdout.write('Seeding foundry-nodes...');
  const fnRows = seedFoundryNodes();
  insertMany(fnRows);
  console.log(` ${fnRows.length} rows`);

  // Server Leading Indicators
  process.stdout.write('Seeding server-indicators...');
  const siRows = seedServerIndicators();
  insertMany(siRows);
  console.log(` ${siRows.length} rows`);

  // Memory Price Indicators
  process.stdout.write('Seeding memory-price...');
  const mpRows = seedMemoryPriceIndicators();
  insertMany(mpRows);
  console.log(` ${mpRows.length} rows`);

  const total = scRows.length + vcmRows1.length + vcmYearlyRows1.length + vcmRows2.length + vcmYearlyRows2.length + cdRows.length + imRows.length + fnRows.length + siRows.length + mpRows.length;
  console.log(`Total: ${total} rows`);
}

main();
