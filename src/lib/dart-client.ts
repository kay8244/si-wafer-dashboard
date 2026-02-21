import { QuarterlyFinancial } from '@/types/company';

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';

// DART reprt_code mapping
const REPORT_CODES = {
  Q1: '11013',    // 1분기보고서
  H1: '11012',    // 반기보고서
  Q3: '11014',    // 3분기보고서
  Annual: '11011', // 사업보고서
} as const;

interface DartAccountEntry {
  rcept_no: string;
  bsns_year: string;
  stock_code: string;
  reprt_code: string;
  account_nm: string;
  fs_div: string;
  fs_nm: string;
  sj_div: string;
  sj_nm: string;
  thstrm_nm: string;
  thstrm_amount: string;
  frmtrm_nm: string;
  frmtrm_amount: string;
  bfefrmtrm_nm: string;
  bfefrmtrm_amount: string;
  ord: string;
  currency: string;
}

interface DartApiResponse {
  status: string;
  message: string;
  list?: DartAccountEntry[];
}

function parseAmount(str: string | undefined | null): number {
  if (!str || str === '' || str === '-') return 0;
  return Number(str.replace(/,/g, '')) || 0;
}

function getMonthEnd(year: number, period: string): string {
  switch (period) {
    case 'Q1': return `${year}-03-31`;
    case 'Q2': return `${year}-06-30`;
    case 'Q3': return `${year}-09-30`;
    case 'Q4': return `${year}-12-31`;
    default: return `${year}-12-31`;
  }
}

async function fetchDartReport(
  apiKey: string,
  corpCode: string,
  year: number,
  reportCode: string
): Promise<Map<string, number>> {
  const url = `${DART_BASE_URL}/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reportCode}&fs_div=OFS`;

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`DART API error: ${response.status}`);
  }

  const data: DartApiResponse = await response.json();

  if (data.status !== '000') {
    // 013 = no data for this period, which is expected for future quarters
    if (data.status === '013') return new Map();
    throw new Error(`DART API: ${data.message} (${data.status})`);
  }

  const accounts = new Map<string, number>();
  if (data.list) {
    for (const entry of data.list) {
      // Only use IS (income statement) items from OFS (개별재무제표)
      // DART returns both CFS(연결) and OFS(별도) entries; filter to OFS only
      if (entry.sj_div === 'IS' && entry.fs_div === 'OFS') {
        accounts.set(entry.account_nm, parseAmount(entry.thstrm_amount));
      }
    }
  }

  return accounts;
}

function extractFinancials(accounts: Map<string, number>): {
  revenue: number;
  operatingIncome: number;
  netIncome: number;
} {
  // DART account names for key metrics
  const revenue = accounts.get('매출액') || accounts.get('수익(매출액)') || accounts.get('영업수익') || 0;
  const operatingIncome = accounts.get('영업이익') || accounts.get('영업이익(손실)') || 0;
  const netIncome = accounts.get('당기순이익') || accounts.get('당기순이익(손실)') || accounts.get('당기순손익') || 0;

  return { revenue, operatingIncome, netIncome };
}

export async function fetchDartQuarterlies(
  apiKey: string,
  corpCode: string
): Promise<QuarterlyFinancial[]> {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const quarterlies: QuarterlyFinancial[] = [];

  for (const year of years) {
    // Fetch all 4 report types for this year in parallel
    const [q1Data, h1Data, q3Data, annualData] = await Promise.all([
      fetchDartReport(apiKey, corpCode, year, REPORT_CODES.Q1).catch(() => new Map<string, number>()),
      fetchDartReport(apiKey, corpCode, year, REPORT_CODES.H1).catch(() => new Map<string, number>()),
      fetchDartReport(apiKey, corpCode, year, REPORT_CODES.Q3).catch(() => new Map<string, number>()),
      fetchDartReport(apiKey, corpCode, year, REPORT_CODES.Annual).catch(() => new Map<string, number>()),
    ]);

    // DART fnlttSinglAcnt returns standalone period amounts (not cumulative):
    //   Q1 report → Q1 standalone, H1 report → Q2 standalone, Q3 report → Q3 standalone
    //   Annual report → full-year cumulative
    // So Q1/Q2/Q3 are used directly, and Q4 = Annual - (Q1 + Q2 + Q3)

    const q1 = q1Data.size > 0 ? extractFinancials(q1Data) : null;
    const q2 = h1Data.size > 0 ? extractFinancials(h1Data) : null;
    const q3 = q3Data.size > 0 ? extractFinancials(q3Data) : null;
    const annual = annualData.size > 0 ? extractFinancials(annualData) : null;

    if (q1) quarterlies.push(buildQuarterly(year, 'Q1', q1));
    if (q2) quarterlies.push(buildQuarterly(year, 'Q2', q2));
    if (q3) quarterlies.push(buildQuarterly(year, 'Q3', q3));

    // Q4: Annual(full-year) - Q1 - Q2 - Q3
    if (annual) {
      const sumQ1Q3 = {
        revenue: (q1?.revenue ?? 0) + (q2?.revenue ?? 0) + (q3?.revenue ?? 0),
        operatingIncome: (q1?.operatingIncome ?? 0) + (q2?.operatingIncome ?? 0) + (q3?.operatingIncome ?? 0),
        netIncome: (q1?.netIncome ?? 0) + (q2?.netIncome ?? 0) + (q3?.netIncome ?? 0),
      };
      quarterlies.push(buildQuarterly(year, 'Q4', {
        revenue: annual.revenue - sumQ1Q3.revenue,
        operatingIncome: annual.operatingIncome - sumQ1Q3.operatingIncome,
        netIncome: annual.netIncome - sumQ1Q3.netIncome,
      }));
    }
  }

  return quarterlies;
}

function buildQuarterly(
  year: number,
  period: string,
  data: { revenue: number; operatingIncome: number; netIncome: number }
): QuarterlyFinancial {
  const date = getMonthEnd(year, period);
  return {
    date,
    calendarYear: String(year),
    period,
    quarter: `${year} ${period}`,
    revenue: data.revenue,
    operatingIncome: data.operatingIncome,
    netIncome: data.netIncome,
    ebitda: 0, // DART 주요계정에서 EBITDA 직접 제공하지 않음
    operatingMargin: data.revenue !== 0 ? data.operatingIncome / data.revenue : 0,
    netMargin: data.revenue !== 0 ? data.netIncome / data.revenue : 0,
    currency: 'KRW',
    // KRW 기업이므로 환산 불필요 (1:1)
    revenueKRW: data.revenue,
    operatingIncomeKRW: data.operatingIncome,
    netIncomeKRW: data.netIncome,
    ebitdaKRW: 0,
    exchangeRate: 1,
  };
}
