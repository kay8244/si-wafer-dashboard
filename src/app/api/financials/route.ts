import { NextRequest, NextResponse } from 'next/server';
import { COMPANIES, COMPANY_IDS, YAHOO_COMPANY_IDS, DART_COMPANY_IDS, DART_CORP_CODES } from '@/lib/constants';
import { fetchQuarterlyIncome, fetchExchangeRates } from '@/lib/yahoo-client';
import type { ExchangeRateMap } from '@/lib/yahoo-client';
import { fetchDartQuarterlies } from '@/lib/dart-client';
import { getCached, setCache, clearCache } from '@/lib/cache';
import { transformYahooStatements } from '@/lib/transform';
import { calculateGrowthRates } from '@/lib/growth';
import { getDemoData } from '@/lib/demo-data';
import { CompanyFinancialData, CompanyId } from '@/types/company';
import { DashboardData, APIResponse } from '@/types/dashboard';

const CACHE_KEY = 'financials_all';

const EMPTY_GROWTH = {
  revenueQoQ: null, revenueYoY: null,
  operatingIncomeQoQ: null, operatingIncomeYoY: null,
  netIncomeQoQ: null, netIncomeYoY: null,
  ebitdaQoQ: null, ebitdaYoY: null,
};

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // Check cache unless forced refresh
    if (!refresh) {
      const cached = await getCached<DashboardData>(CACHE_KEY);
      if (cached) {
        return NextResponse.json<APIResponse<DashboardData>>({
          success: true,
          data: cached,
          lastUpdated: cached.lastUpdated,
        });
      }
    } else {
      await clearCache(CACHE_KEY);
    }

    const results: Record<string, CompanyFinancialData> = {};
    const errors: string[] = [];

    // === Yahoo Finance 기업 처리 ===
    const rawDataMap = new Map<CompanyId, Awaited<ReturnType<typeof fetchQuarterlyIncome>>>();

    await Promise.all(
      YAHOO_COMPANY_IDS.map(async (id) => {
        try {
          const data = await fetchQuarterlyIncome(COMPANIES[id].symbol);
          rawDataMap.set(id, data);
        } catch (error) {
          errors.push(`${COMPANIES[id].nameKo}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );

    // Collect dates per currency for exchange rate fetching
    const datesByCurrency = new Map<string, Set<string>>();
    for (const [id, data] of rawDataMap) {
      const currency = COMPANIES[id].currency;
      if (!datesByCurrency.has(currency)) {
        datesByCurrency.set(currency, new Set());
      }
      const dateSet = datesByCurrency.get(currency)!;
      for (const stmt of data.statements) {
        dateSet.add(stmt.date.toISOString().split('T')[0]);
      }
    }

    // Fetch exchange rates for all currencies in parallel
    const exchangeRatesByCurrency = new Map<string, ExchangeRateMap>();
    await Promise.all(
      Array.from(datesByCurrency.entries()).map(async ([currency, dates]) => {
        const rates = await fetchExchangeRates(currency, Array.from(dates));
        exchangeRatesByCurrency.set(currency, rates);
      })
    );

    // Transform Yahoo data with exchange rates
    for (const id of YAHOO_COMPANY_IDS) {
      const rawData = rawDataMap.get(id);
      if (!rawData) {
        results[id] = {
          company: COMPANIES[id],
          quarterlies: [],
          latestGrowth: EMPTY_GROWTH,
          error: errors.find((e) => e.startsWith(COMPANIES[id].nameKo)) || 'Unknown error',
        };
        continue;
      }

      const currency = COMPANIES[id].currency;
      const rates = exchangeRatesByCurrency.get(currency) || new Map();
      const quarterlies = transformYahooStatements(rawData.statements, currency, rates);
      const latestGrowth = calculateGrowthRates(quarterlies);
      results[id] = { company: COMPANIES[id], quarterlies, latestGrowth };
    }

    // === DART 기업 처리 ===
    const dartApiKey = process.env.DART_API_KEY;
    const demoFallback = getDemoData();

    await Promise.all(
      DART_COMPANY_IDS.map(async (id) => {
        const corpCode = DART_CORP_CODES[id];
        if (!dartApiKey || !corpCode) {
          // API 키 없으면 데모 데이터 사용
          results[id] = demoFallback.companies[id];
          if (!dartApiKey) {
            results[id] = { ...results[id], error: '데모 데이터 (DART API 키 미설정)' };
          }
          return;
        }

        try {
          const quarterlies = await fetchDartQuarterlies(dartApiKey, corpCode);
          const latestGrowth = calculateGrowthRates(quarterlies);
          results[id] = { company: COMPANIES[id], quarterlies, latestGrowth };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${COMPANIES[id].nameKo}: ${message}`);
          // DART 실패 시에도 데모 데이터 폴백
          results[id] = { ...demoFallback.companies[id], error: `데모 데이터 (${message})` };
        }
      })
    );

    // If all companies failed, fall back to demo data
    const hasAnyData = COMPANY_IDS.some((id) => results[id]?.quarterlies?.length > 0);
    if (!hasAnyData) {
      const demoData = getDemoData();
      demoData.errors = ['API 호출이 모두 실패하여 데모 데이터를 표시합니다.', ...errors];
      return NextResponse.json<APIResponse<DashboardData>>({
        success: true,
        data: demoData,
        lastUpdated: demoData.lastUpdated,
      });
    }

    const dashboardData: DashboardData = {
      companies: results as Record<CompanyId, CompanyFinancialData>,
      lastUpdated: new Date().toISOString(),
      errors,
    };

    await setCache(CACHE_KEY, dashboardData);

    return NextResponse.json<APIResponse<DashboardData>>({
      success: true,
      data: dashboardData,
      lastUpdated: dashboardData.lastUpdated,
    });
  } catch (error) {
    const demoData = getDemoData();
    const message = error instanceof Error ? error.message : 'Internal server error';
    demoData.errors = [`서버 오류로 데모 데이터를 표시합니다: ${message}`];

    return NextResponse.json<APIResponse<DashboardData>>({
      success: true,
      data: demoData,
      lastUpdated: demoData.lastUpdated,
    });
  }
}
