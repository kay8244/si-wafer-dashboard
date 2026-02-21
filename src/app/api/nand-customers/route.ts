import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { NAND_CUSTOMERS, NAND_CUSTOMER_IDS } from '@/lib/nand-constants';
import { fetchQuarterlyIncome, fetchExchangeRates } from '@/lib/yahoo-client';
import type { ExchangeRateMap } from '@/lib/yahoo-client';
import { getCached, setCache, clearCache } from '@/lib/cache';
import { transformYahooStatements } from '@/lib/transform';
import { calculateGrowthRates } from '@/lib/growth';
import { NandCustomerId, NandCustomerData, NandDashboardData, NandMetrics } from '@/types/nand-customer';
import { QuarterlyFinancial, GrowthRate } from '@/types/company';
import { APIResponse } from '@/types/dashboard';

const CACHE_KEY = 'nand_customers';

const EMPTY_GROWTH: GrowthRate = {
  revenueQoQ: null, revenueYoY: null,
  operatingIncomeQoQ: null, operatingIncomeYoY: null,
  netIncomeQoQ: null, netIncomeYoY: null,
  ebitdaQoQ: null, ebitdaYoY: null,
};

interface RawMetricsEntry {
  quarter: string;
  asp: number | null;
  aspChangeQoQ: number | null;
  bitShipmentGrowthQoQ: number | null;
  bitShipmentGrowthYoY: number | null;
  capex: number;
  capexKRW: number;
  qlcRatio: number | null;
  inventoryDays: number | null;
  utilizationRate: number | null;
  layerStack: { layer128: number | null; layer176: number | null; layer232: number | null; legacy: number | null } | null;
}

interface RawJsonData {
  lastUpdated: string;
  customers: Record<string, { nandMetrics: RawMetricsEntry[] }>;
}

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!refresh) {
      const cached = await getCached<NandDashboardData>(CACHE_KEY);
      if (cached) {
        return NextResponse.json<APIResponse<NandDashboardData>>({
          success: true,
          data: cached,
          lastUpdated: cached.lastUpdated,
        });
      }
    } else {
      await clearCache(CACHE_KEY);
    }

    // 1. Read NAND-specific metrics from JSON (ASP, QLC, Capex 등 API 수집 불가 데이터)
    const dataPath = path.join(process.cwd(), 'data', 'nand-customers.json');
    const rawJson = await fs.readFile(dataPath, 'utf-8');
    const rawData: RawJsonData = JSON.parse(rawJson);

    const errors: string[] = [];
    const results: Record<string, NandCustomerData> = {};

    // 2. Yahoo Finance에서 재무실적 가져오기 (경쟁사 분석과 동일한 방식)
    const rawDataMap = new Map<NandCustomerId, Awaited<ReturnType<typeof fetchQuarterlyIncome>>>();

    await Promise.all(
      NAND_CUSTOMER_IDS.map(async (id) => {
        try {
          const data = await fetchQuarterlyIncome(NAND_CUSTOMERS[id].symbol);
          rawDataMap.set(id, data);
        } catch (error) {
          errors.push(`${NAND_CUSTOMERS[id].nameKo}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );

    // 3. 환율 데이터 수집 (통화별 날짜 모으기)
    const datesByCurrency = new Map<string, Set<string>>();
    for (const [id, data] of rawDataMap) {
      const currency = NAND_CUSTOMERS[id].currency;
      if (!datesByCurrency.has(currency)) {
        datesByCurrency.set(currency, new Set());
      }
      const dateSet = datesByCurrency.get(currency)!;
      for (const stmt of data.statements) {
        dateSet.add(stmt.date.toISOString().split('T')[0]);
      }
    }

    // 4. 환율 가져오기 (KRW는 1, USD→KRW 환율 필요)
    const exchangeRatesByCurrency = new Map<string, ExchangeRateMap>();
    await Promise.all(
      Array.from(datesByCurrency.entries()).map(async ([currency, dates]) => {
        const rates = await fetchExchangeRates(currency, Array.from(dates));
        exchangeRatesByCurrency.set(currency, rates);
      })
    );

    // 5. 각 고객사 데이터 조합
    for (const id of NAND_CUSTOMER_IDS) {
      const customerDef = NAND_CUSTOMERS[id];
      const rawMetricsData = rawData.customers[id];

      // Yahoo Finance 데이터 변환
      const rawYahoo = rawDataMap.get(id);
      let segmentFinancials: QuarterlyFinancial[] = [];
      let latestGrowth: GrowthRate = EMPTY_GROWTH;

      if (rawYahoo) {
        const currency = customerDef.currency;
        const rates = exchangeRatesByCurrency.get(currency) || new Map();
        segmentFinancials = transformYahooStatements(rawYahoo.statements, currency, rates);
        latestGrowth = calculateGrowthRates(segmentFinancials);
      } else if (!errors.find((e) => e.startsWith(customerDef.nameKo))) {
        errors.push(`${customerDef.nameKo}: Yahoo Finance 데이터 없음`);
      }

      // NAND 특화 지표 (JSON에서 가져오기)
      let nandMetrics: NandMetrics[] = [];
      if (rawMetricsData?.nandMetrics) {
        // USD 고객사의 capexKRW를 최신 환율로 재계산
        const isUSD = customerDef.currency === 'USD';
        const latestRate = isUSD && segmentFinancials.length > 0
          ? segmentFinancials[segmentFinancials.length - 1].exchangeRate
          : 1;

        nandMetrics = rawMetricsData.nandMetrics.map((m) => ({
          ...m,
          capexKRW: isUSD ? Math.round(m.capex * latestRate) : m.capexKRW || m.capex,
        }));
      }

      results[id] = {
        customer: customerDef,
        segmentFinancials,
        nandMetrics,
        latestGrowth,
        error: segmentFinancials.length === 0
          ? errors.find((e) => e.startsWith(customerDef.nameKo)) || undefined
          : undefined,
      };
    }

    const dashboardData: NandDashboardData = {
      customers: results as Record<NandCustomerId, NandCustomerData>,
      lastUpdated: new Date().toISOString(),
      errors,
    };

    await setCache(CACHE_KEY, dashboardData);

    return NextResponse.json<APIResponse<NandDashboardData>>({
      success: true,
      data: dashboardData,
      lastUpdated: dashboardData.lastUpdated,
    });
  } catch (error) {
    // 실패 시 빈 데모 데이터 폴백 (financials API와 동일한 패턴)
    const message = error instanceof Error ? error.message : 'Internal server error';
    const emptyGrowth: GrowthRate = {
      revenueQoQ: null, revenueYoY: null,
      operatingIncomeQoQ: null, operatingIncomeYoY: null,
      netIncomeQoQ: null, netIncomeYoY: null,
      ebitdaQoQ: null, ebitdaYoY: null,
    };
    const fallbackCustomers: Record<NandCustomerId, NandCustomerData> = {} as Record<NandCustomerId, NandCustomerData>;
    for (const id of NAND_CUSTOMER_IDS) {
      fallbackCustomers[id] = {
        customer: NAND_CUSTOMERS[id],
        segmentFinancials: [],
        nandMetrics: [],
        latestGrowth: emptyGrowth,
        error: `데모 데이터 (${message})`,
      };
    }

    return NextResponse.json<APIResponse<NandDashboardData>>({
      success: true,
      data: {
        customers: fallbackCustomers,
        lastUpdated: new Date().toISOString(),
        errors: [`서버 오류로 빈 데이터를 표시합니다: ${message}`],
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
