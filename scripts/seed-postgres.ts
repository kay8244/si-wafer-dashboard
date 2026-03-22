// Postgres seeding script
// Usage: POSTGRES_URL=... npx tsx scripts/seed-postgres.ts
// Or with .env.local: npx dotenv -e .env.local -- npx tsx scripts/seed-postgres.ts

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';
import {
  SUPPLY_CHAIN_CATEGORIES,
  INTERNAL_COMPANY_DATA,
  OVERLAY_COLORS,
  FOUNDRY_NODES,
  FOUNDRY_NODE_COLORS,
} from '../src/data/supply-chain-mock';
import { seededValue as seededVal, getRecentMonths } from '../src/lib/data-generation';
import {
  VCM_DATA,
  VCM_VERSIONS,
  NEWS_QUERIES_BY_CATEGORY,
  MOUNT_PER_UNIT_BY_CATEGORY,
} from '../src/data/vcm-mock';
import { CUSTOMER_LIST, CUSTOMER_EXECUTIVES } from '../src/data/customer-detail-mock';

const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!POSTGRES_URL) {
  console.error('Error: POSTGRES_URL or DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

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
      for (const m of ind.monthly) {
        rows.push(row('supply-chain', m.month, ind.name, 'actual', m.actual, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'threeMonthMA', m.threeMonthMA, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'twelveMonthMA', m.twelveMonthMA, ind.unit));
        rows.push(row('supply-chain', m.month, ind.name, 'mom', m.mom, '%'));
        rows.push(row('supply-chain', m.month, ind.name, 'yoy', m.yoy, '%'));
      }
      rows.push(
        row(
          'supply-chain', '_meta', ind.name, 'indicatorMeta', null, ind.unit, 0, null,
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

  for (const [companyId, color] of Object.entries(OVERLAY_COLORS)) {
    rows.push(
      row('supply-chain', '_meta', companyId, 'overlayColor', null, null, 0, null, JSON.stringify({ color })),
    );
  }

  return rows;
}

// ── 2. VCM ───────────────────────────────────────────────────────────────────

function seedVcm(): Row[] {
  const rows: Row[] = [];

  for (const [appKey, app] of Object.entries(VCM_DATA.applicationDemands)) {
    for (const y of app.yearly) {
      rows.push(row('vcm', y.year.toString(), app.label, 'appDemand', y.value, 'units', y.isEstimate ? 1 : 0, null, JSON.stringify({ application: appKey })));
    }
  }

  for (const [, device] of Object.entries(VCM_DATA.deviceWaferDemands)) {
    for (const y of device.yearly) {
      rows.push(row('vcm', y.year.toString(), device.label, 'deviceWaferDemand', y.waferDemand, 'K/M', y.isEstimate ? 1 : 0, null, JSON.stringify({ device: device.device })));
    }
  }

  for (const t of VCM_DATA.totalWaferDemand) {
    rows.push(row('vcm', t.year.toString(), 'Total', 'totalWaferDemand', t.total, 'K/M', t.isEstimate ? 1 : 0));
  }

  for (const q of VCM_DATA.totalWaferQuarterly) {
    const est = q.isEstimate ? 1 : 0;
    rows.push(row('vcm', q.quarter, 'Total', 'totalWaferQuarterly_total', q.total, 'K/M', est));
    rows.push(row('vcm', q.quarter, 'Total', 'totalWaferQuarterly_pw', q.pw, 'K/M', est));
    rows.push(row('vcm', q.quarter, 'Total', 'totalWaferQuarterly_epi', q.epi, 'K/M', est));
  }

  for (const [appKey, quarters] of Object.entries(VCM_DATA.applicationQuarterlyDemands)) {
    const app = VCM_DATA.applicationDemands[appKey as keyof typeof VCM_DATA.applicationDemands];
    const appLabel = app?.label ?? appKey;
    for (const q of quarters) {
      rows.push(row('vcm', q.quarter, appLabel, 'quarterlyDemand', q.value, 'units', q.isEstimate ? 1 : 0, null, JSON.stringify({ application: appKey })));
    }
  }

  for (const [appKey, entries] of Object.entries(VCM_DATA.deviceStackedByApp)) {
    const app = VCM_DATA.applicationDemands[appKey as keyof typeof VCM_DATA.applicationDemands];
    const appLabel = app?.label ?? appKey;
    for (const entry of entries) {
      const est = entry.isEstimate ? 1 : 0;
      const meta = JSON.stringify({ application: appKey });
      const deviceTypes = ['dram', 'hbm', 'nand', 'otherMemory', 'logic', 'analog', 'discrete', 'sensor'] as const;
      for (const dt of deviceTypes) {
        const val = entry[dt];
        if (val !== undefined) {
          rows.push(row('vcm', entry.quarter, appLabel, `stacked_${dt}`, val, 'K/M', est, null, meta));
        }
      }
    }
  }

  for (const [appKey, quarters] of Object.entries(VCM_DATA.quarterlyMountPerUnit)) {
    const app = VCM_DATA.applicationDemands[appKey as keyof typeof VCM_DATA.applicationDemands];
    const appLabel = app?.label ?? appKey;
    for (const q of quarters) {
      rows.push(row('vcm', q.quarter, appLabel, 'quarterlyMountPerUnit', q.value, 'sheets/unit', q.isEstimate ? 1 : 0, null, JSON.stringify({ application: appKey })));
    }
  }

  for (const entry of VCM_DATA.mountPerUnit) {
    for (const metric of entry.metrics) {
      rows.push(row('vcm', metric.year.toString(), entry.label, 'mountPerUnit', metric.value, metric.unit, 0, null, JSON.stringify({ serverType: entry.serverType })));
    }
  }

  for (const [appKey, entries] of Object.entries(VCM_DATA.mountPerUnitByApp)) {
    for (const entry of entries) {
      for (const metric of entry.metrics) {
        rows.push(row('vcm', metric.year.toString(), entry.label, 'mountPerUnitByApp', metric.value, metric.unit, 0, null, JSON.stringify({ application: appKey, serverType: entry.serverType })));
      }
    }
  }

  for (const news of VCM_DATA.news) {
    rows.push(row('vcm', news.date, news.source, 'vcmNews', null, null, 0, null, JSON.stringify({ title: news.title, summary: news.summary })));
  }

  for (const version of VCM_VERSIONS) {
    rows.push(row('vcm', version.date, version.id, 'vcmVersion', null, null, 0, null, JSON.stringify({ label: version.label })));
  }

  for (const [categoryKey, query] of Object.entries(NEWS_QUERIES_BY_CATEGORY)) {
    rows.push(row('vcm', '_meta', categoryKey, 'newsQueryByCategory', null, null, 0, null, JSON.stringify({ queryKo: query.queryKo, queryEn: query.queryEn })));
  }

  for (const entry of VCM_DATA.applicationTable) {
    for (const y of entry.yearly) {
      rows.push(row('vcm', y.year.toString(), entry.application, 'applicationTable', y.value, 'units', y.isEstimate ? 1 : 0));
    }
  }

  for (const [appKey, totals] of Object.entries(VCM_DATA.totalWaferDemandByApp)) {
    const app = VCM_DATA.applicationDemands[appKey as keyof typeof VCM_DATA.applicationDemands];
    const appLabel = app?.label ?? appKey;
    for (const t of totals) {
      rows.push(row('vcm', t.year.toString(), appLabel, 'totalWaferDemandByApp', t.total, 'K/M', t.isEstimate ? 1 : 0, null, JSON.stringify({ application: appKey })));
    }
  }

  for (const [catKey, entries] of Object.entries(MOUNT_PER_UNIT_BY_CATEGORY)) {
    for (const entry of entries) {
      for (const metric of entry.metrics) {
        rows.push(row('vcm', metric.year.toString(), entry.label, 'mountPerUnitByCategory', metric.value, metric.unit, 0, null, JSON.stringify({ categoryType: catKey, serverType: entry.serverType })));
      }
    }
  }

  for (const [appKey, query] of Object.entries(VCM_DATA.newsQueries)) {
    rows.push(row('vcm', '_meta', appKey, 'newsQuery', null, null, 0, null, JSON.stringify({ queryKo: query.queryKo, queryEn: query.queryEn })));
  }

  return rows;
}

// ── 3. Customer Detail ───────────────────────────────────────────────────────

function seedCustomerDetail(): Row[] {
  const rows: Row[] = [];

  for (const cust of CUSTOMER_LIST) {
    rows.push(row('customer-detail', '_meta', cust.id, 'customerList', null, null, 0, null, JSON.stringify({ label: cust.label, type: cust.type, subLabel: cust.subLabel })));
  }

  for (const [custId, exec] of Object.entries(CUSTOMER_EXECUTIVES)) {
    rows.push(row('customer-detail', '_meta', custId, 'customerMeta', null, null, 0, null, JSON.stringify({
      label: exec.label, type: exec.type,
      newsQueryKo: exec.newsQueryKo, newsQueryEn: exec.newsQueryEn,
      foundryData: exec.foundryData, mktInfo: exec.mktInfo,
      versionLabel: exec.versionLabel, prevVersionLabel: exec.prevVersionLabel,
    })));

    for (const kpi of exec.kpiMetrics) {
      const val = parseFloat(kpi.value);
      rows.push(row('customer-detail', '_kpi', custId, `kpiMetric_${kpi.label}`, isNaN(val) ? null : val, kpi.unit ?? null));
    }

    for (const kpi of exec.configurableKpis) {
      const val = parseFloat(kpi.value);
      rows.push(row('customer-detail', '_kpi', custId, `configurableKpi_${kpi.id}`, isNaN(val) ? null : val, kpi.unit, 0, null, JSON.stringify({ label: kpi.label, trend: kpi.trend, trendValue: kpi.trendValue })));
    }

    for (const item of exec.productMix) {
      rows.push(row('customer-detail', '_mix', custId, `productMix_${item.category}`, item.percentage, '%', 0, null, JSON.stringify({ color: item.color })));
    }

    for (const trend of exec.productMixTrend) {
      for (const [catName, catValue] of Object.entries(trend.values)) {
        rows.push(row('customer-detail', trend.quarter, custId, `productMixTrend_${catName}`, catValue as number, '%'));
      }
    }

    for (const wi of exec.waferInput) {
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_km2', wi.km2, 'Km'));
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_km', wi.km, 'Km'));
      rows.push(row('customer-detail', wi.quarter, custId, 'waferInput_kpcs', wi.kpcs, 'Kpcs'));
    }

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

    for (const q of exec.waferInOutQuarterly) {
      const est = q.isEstimate ? 1 : 0;
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_waferIn', q.waferIn, 'K/M', est));
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_waferOut', q.waferOut, 'K/M', est));
      if (q.dramRatio !== undefined) {
        rows.push(row('customer-detail', q.quarter, custId, 'quarterly_dramRatio', q.dramRatio, 'ratio', est));
      }
    }

    for (const q of exec.bitGrowthQuarterly) {
      const est = q.isEstimate ? 1 : 0;
      rows.push(row('customer-detail', q.quarter, custId, 'quarterly_bitGrowth', q.growth, '%', est));
      if (q.growthTF !== undefined) {
        rows.push(row('customer-detail', q.quarter, custId, 'quarterly_bitGrowthTF', q.growthTF, '%', est));
      }
    }

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

    for (const sr of exec.scrapRate) {
      rows.push(row('customer-detail', '_static', custId, `scrapRate_${sr.label}`, sr.internal, '%', 0, null, JSON.stringify({ external: sr.external })));
    }

    for (const ec of exec.externalComparison) {
      rows.push(row('customer-detail', '_static', custId, `externalComparison_${ec.source}`, null, null, 0, null, JSON.stringify({ waferBitOut: ec.waferBitOut, bitGrowth: ec.bitGrowth, gap: ec.gap })));
    }

    for (const news of exec.news) {
      rows.push(row('customer-detail', news.date, custId, 'news', null, null, 0, null, JSON.stringify({ source: news.source, title: news.title, categories: news.categories })));
    }

    if (exec.weeklySummary) {
      const ws = exec.weeklySummary;
      rows.push(row('customer-detail', '_weekly', custId, 'weeklySummary', null, null, 0, null, JSON.stringify({ weekLabel: ws.weekLabel, comment: ws.comment })));
    }

    // Financial data
    const FINANCIAL_QUARTERS = [
      '4Q21', '1Q22', '2Q22', '3Q22', '4Q22',
      '1Q23', '2Q23', '3Q23', '4Q23',
      '1Q24', '2Q24', '3Q24', '4Q24',
      '1Q25', '2Q25', '3Q25', '4Q25',
    ];
    const FINANCIAL_BASE: Record<string, { rev: number; oi: number }> = {
      SEC:             { rev: 78000000, oi: 15000000 },
      SKHynix:         { rev: 13000000, oi: 3500000  },
      Micron:          { rev:     8100, oi:    1800  },
      Koxia:           { rev:   500000, oi:   60000  },
      SEC_Foundry:     { rev:  5500000, oi:  500000  },
      TSMC:            { rev:   680000, oi:  300000  },
      SMC:             { rev:    13000, oi:    1300  },
      GFS:             { rev:     1850, oi:     200  },
      STM:             { rev:     4100, oi:     700  },
      Intel:           { rev:    13500, oi:    1200  },
      Total_DRAM_NAND: { rev:    43800, oi:   12500  },
      Total_Foundry:   { rev:    31500, oi:   10400  },
    };
    const base = FINANCIAL_BASE[custId];
    if (base) {
      FINANCIAL_QUARTERS.forEach((q, i) => {
        const cycleFactor = 1 + 0.12 * Math.sin((i / 14) * Math.PI * 2.5);
        const growthFactor = 1 + i * 0.015;
        const rev = Math.round(base.rev * cycleFactor * growthFactor);
        const oi  = Math.round(base.oi  * cycleFactor * cycleFactor * growthFactor);
        rows.push(row('customer-detail', q, custId, 'financial_revenue', rev, '$M'));
        rows.push(row('customer-detail', q, custId, 'financial_operatingIncome', oi, '$M'));
      });
    }

    // Transcript
    const TRANSCRIPT_SUMMARIES: Record<string, string> = {
      SEC: '삼성전자는 4Q24 실적발표에서 메모리 반도체 수요 회복세를 확인하며 HBM3E 양산 확대 계획을 발표했습니다.',
      SKHynix: 'SK하이닉스는 4Q24 어닝콜에서 HBM3E 12단 양산 성공 및 주요 AI 고객사 공급 확대를 발표했습니다.',
      Micron: 'Micron은 4Q24 실적발표에서 DRAM 및 NAND 수요가 AI 서버 중심으로 강하게 회복되고 있음을 확인했습니다.',
      Koxia: 'Kioxia는 4Q24 결산 설명회에서 NAND 수요 회복에 따른 가동률 개선과 재고 정상화 진행 상황을 공유했습니다.',
      SEC_Foundry: '삼성 파운드리는 4Q24 어닝콜에서 2nm GAA 공정 수율 개선이 계획 대비 순조롭다고 밝혔습니다.',
      TSMC: 'TSMC는 4Q24 실적에서 사상 최대 매출을 기록하며 AI 반도체 수요의 강한 성장을 재확인했습니다.',
      SMC: 'SMIC는 4Q24 실적발표에서 성숙 공정(28nm 이상) 중심의 가동률 회복세를 보고했습니다.',
      GFS: 'GlobalFoundries는 4Q24 어닝콜에서 자동차 및 통신 반도체 수요 회복에 따른 수주 증가를 발표했습니다.',
      STM: 'STMicroelectronics는 4Q24 실적발표에서 SiC 전력반도체 수요 확대에 따른 자동차향 매출 성장을 강조했습니다.',
      Intel: 'Intel Foundry는 4Q24에서 외부 고객 수주 확대 및 18A 공정 수율 개선 현황을 공유했습니다.',
      Total_DRAM_NAND: '4Q24 메모리 산업 합산 기준으로 DRAM ASP는 전분기 대비 7~10% 상승하였으며, NAND 공급 과잉이 완화됐습니다.',
      Total_Foundry: '4Q24 파운드리 업계 합산 기준으로 선단 공정 가동률이 90%를 상회하며 AI 반도체 수요 집중 현상이 뚜렷했습니다.',
    };
    const summary = TRANSCRIPT_SUMMARIES[custId];
    if (summary) {
      rows.push(row('customer-detail', '4Q24', custId, 'transcript', null, null, 0, null, JSON.stringify({
        summary,
        excelUrl: `/files/transcript-${custId}-4Q24.xlsx`,
        pdfUrl: `https://example.com/transcript-${custId}-4Q24.pdf`,
      })));
    }
  }

  return rows;
}

// ── 4. Industry Metrics ───────────────────────────────────────────────────────

function seededValue(base: number, spread: number, seed: number): number {
  const h = Math.sin(seed * 9301 + 49297) * 233280;
  const r = h - Math.floor(h);
  return Math.round((base + (r - 0.5) * spread * 2) * 10) / 10;
}

function seedIndustryMetrics(): Row[] {
  const rows: Row[] = [];

  const HBM_QUARTERS = ['1Q24', '2Q24', '3Q24', '4Q24', '1Q25', '2Q25', '3Q25', '4Q25', '1Q26', '2Q26', '3Q26', '4Q26'];
  const HBM_CONFIG: Record<string, { base: number; spread: number }> = {
    SEC:     { base: 20, spread: 5 },
    SKHynix: { base: 25, spread: 5 },
    Micron:  { base: 15, spread: 5 },
    Koxia:   { base: 10, spread: 5 },
  };

  for (const [custId, cfg] of Object.entries(HBM_CONFIG)) {
    HBM_QUARTERS.forEach((q, i) => {
      rows.push(row('customer-detail', q, custId, 'industry_metric',
        seededValue(cfg.base, cfg.spread, i + custId.charCodeAt(0)), '%', 0, null,
        JSON.stringify({ metricId: 'hbm_bit_growth', name: 'HBM Bit growth', period: 'quarterly' })));
    });
  }

  const MONTHS_12 = ['25.01','25.02','25.03','25.04','25.05','25.06','25.07','25.08','25.09','25.10','25.11','25.12'];

  function addUtilMetric(custId: string, metricId: string, name: string, tooltip: string | undefined, base: number, spread: number, unit: string, seedOffset: number) {
    MONTHS_12.forEach((m, i) => {
      rows.push(row('customer-detail', m, custId, 'industry_metric',
        seededValue(base, spread, i + seedOffset), unit, 0, null,
        JSON.stringify({ metricId, name, ...(tooltip ? { tooltip } : {}), period: 'monthly' })));
    });
  }

  const S = 100;
  addUtilMetric('SEC_Foundry', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 84, 4, '%', 1*S);
  addUtilMetric('SEC_Foundry', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 90, 5, '%', 2*S);
  addUtilMetric('SEC_Foundry', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 70, 5, '%', 3*S);
  addUtilMetric('SMC', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 82, 4, '%', 4*S);
  addUtilMetric('SMC', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 68, 5, '%', 5*S);
  addUtilMetric('TSMC', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 85, 3, '%', 6*S);
  addUtilMetric('TSMC', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 92, 4, '%', 7*S);
  addUtilMetric('TSMC', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 72, 5, '%', 8*S);
  addUtilMetric('GFS', 'tsmc_legacy_util', 'TSMC 비선단 가동률', '90nm, 45nm, 28nm, 12nm', 81, 4, '%', 9*S);
  addUtilMetric('GFS', 'umc_legacy_util', 'UMC 비선단 가동률', undefined, 67, 5, '%', 10*S);
  addUtilMetric('STM', 'auto_shipment', 'Auto 출하량', undefined, 1000, 200, 'M units', 11*S);
  addUtilMetric('STM', 'analog_revenue', 'Analog 매출액', undefined, 3500, 1000, '$M', 12*S);
  addUtilMetric('STM', 'analog_volume', 'Analog 수량', undefined, 8000, 2000, 'M units', 13*S);
  addUtilMetric('STM', 'mcu_revenue', 'MCU 매출액', undefined, 2800, 800, '$M', 14*S);
  addUtilMetric('STM', 'mcu_volume', 'MCU 수량', undefined, 6500, 1500, 'M units', 15*S);
  addUtilMetric('Intel', 'tsmc_advanced_util', 'TSMC 선단 가동률', '7nm, 5nm, 3nm, 2nm', 88, 5, '%', 16*S);
  addUtilMetric('Intel', 'mpu_revenue', 'MPU 매출액', undefined, 4200, 1200, '$M', 17*S);
  addUtilMetric('Intel', 'mpu_volume', 'MPU 수량', undefined, 9000, 2500, 'M units', 18*S);

  return rows;
}

// ── 5. Foundry Nodes ──────────────────────────────────────────────────────

function seedFoundryNodes(): Row[] {
  const rows: Row[] = [];
  for (const [company, nodes] of Object.entries(FOUNDRY_NODES)) {
    for (const node of nodes) {
      const nodeCustomer = `${company}_${node.id}`;
      for (const m of node.monthly) {
        rows.push(row('supply-chain', m.month, nodeCustomer, 'foundry_node', m.waferInput, 'K/M', 0, company,
          JSON.stringify({ capa: m.capa, nodeId: node.id, nodeLabel: node.label, category: node.category })));
      }
    }
  }
  for (const [nodeId, color] of Object.entries(FOUNDRY_NODE_COLORS)) {
    rows.push(row('supply-chain', '_meta', nodeId, 'foundry_node_color', null, null, 0, color));
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
      const curr = ma12[idx]; const prev = ma12[idx - 12];
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
      rows.push(row('supply-chain', d.month, ind.id, 'server_indicator', d.value, '%', 0, displayName,
        JSON.stringify({ group: ind.group, subGroup: ind.subGroup, company: ind.company })));
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
      rows.push(row('supply-chain', d.month, ind.id, 'memory_price', d.value, ind.unit, 0, ind.name));
    }
  }
  return rows;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        tab TEXT NOT NULL,
        date TEXT NOT NULL,
        customer TEXT NOT NULL,
        category TEXT NOT NULL,
        value REAL,
        unit TEXT,
        is_estimate INTEGER DEFAULT 0,
        version TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tab ON metrics(tab);
      CREATE INDEX IF NOT EXISTS idx_tab_customer ON metrics(tab, customer);
      CREATE INDEX IF NOT EXISTS idx_tab_date ON metrics(tab, date);
      CREATE INDEX IF NOT EXISTS idx_tab_cat ON metrics(tab, category);
    `);

    // Clear existing data
    await client.query('DELETE FROM metrics');

    const insertRows = async (label: string, rows: Row[]) => {
      process.stdout.write(`Seeding ${label}...`);
      // Batch insert in chunks of 500
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const values: (string | number | null)[] = [];
        const placeholders = chunk.map((_, j) => {
          const base = j * 9;
          return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
        }).join(', ');
        for (const r of chunk) {
          values.push(r.tab, r.date, r.customer, r.category, r.value, r.unit, r.is_estimate, r.version, r.metadata);
        }
        await client.query(
          `INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, version, metadata) VALUES ${placeholders}`,
          values,
        );
      }
      console.log(` ${rows.length} rows`);
    };

    const scRows = seedSupplyChain();
    await insertRows('supply-chain', scRows);

    const vcmRows = seedVcm();
    await insertRows('vcm', vcmRows);

    const cdRows = seedCustomerDetail();
    await insertRows('customer-detail', cdRows);

    const imRows = seedIndustryMetrics();
    await insertRows('industry-metrics', imRows);

    const fnRows = seedFoundryNodes();
    await insertRows('foundry-nodes', fnRows);

    const siRows = seedServerIndicators();
    await insertRows('server-indicators', siRows);

    const mpRows = seedMemoryPriceIndicators();
    await insertRows('memory-price', mpRows);

    const total = scRows.length + vcmRows.length + cdRows.length + imRows.length + fnRows.length + siRows.length + mpRows.length;
    console.log(`Total: ${total} rows`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
