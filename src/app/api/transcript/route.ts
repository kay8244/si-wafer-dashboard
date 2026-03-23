import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from '@/lib/cache';
import { queryMetrics } from '@/lib/db';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/** Company search queries for earnings call transcripts */
/** Search queries targeting transcript aggregator sites (Seeking Alpha, Motley Fool, etc.) */
const TRANSCRIPT_QUERIES: Record<string, { queryEn: string; companyName: string }> = {
  SEC: { queryEn: 'Samsung Electronics earnings call transcript 2024 2025 revenue operating profit semiconductor', companyName: 'Samsung Electronics' },
  SKHynix: { queryEn: 'SK Hynix earnings call transcript 2024 2025 revenue operating profit HBM DRAM', companyName: 'SK Hynix' },
  Micron: { queryEn: 'Micron Technology earnings call transcript 2025 revenue gross margin DRAM NAND', companyName: 'Micron Technology' },
  Koxia: { queryEn: 'Kioxia earnings results 2024 2025 revenue NAND flash financial results', companyName: 'Kioxia' },
  SEC_Foundry: { queryEn: 'Samsung Electronics earnings call transcript 2024 2025 foundry revenue utilization', companyName: 'Samsung Foundry' },
  TSMC: { queryEn: 'TSMC earnings call transcript 2024 2025 revenue capex advanced node AI wafer', companyName: 'TSMC' },
  SMC: { queryEn: 'SMIC earnings call transcript 2024 2025 revenue utilization rate semiconductor', companyName: 'SMIC' },
  GFS: { queryEn: 'GlobalFoundries earnings call transcript 2024 2025 revenue automotive semiconductor', companyName: 'GlobalFoundries' },
  STM: { queryEn: 'STMicroelectronics earnings call transcript 2024 2025 revenue automotive SiC', companyName: 'STMicroelectronics' },
  Intel: { queryEn: 'Intel earnings call transcript 2024 2025 revenue foundry IFS semiconductor', companyName: 'Intel' },
  Total_DRAM_NAND: { queryEn: 'DRAM NAND memory semiconductor market 2025 outlook revenue bit growth forecast', companyName: 'Memory Industry' },
  Total_Foundry: { queryEn: 'semiconductor foundry market 2025 outlook revenue utilization TSMC Samsung forecast', companyName: 'Foundry Industry' },
};

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
}

/** Preferred domains for high-quality transcript content */
const PREFERRED_DOMAINS = [
  'fool.com',
  'seekingalpha.com',
  'investor.tsmc.com',
  'investors.micron.com',
  'skhynix.com',
  'samsung.com',
  'globalfoundries.com',
  'investors.st.com',
];

async function searchTavily(query: string): Promise<TavilyResult[]> {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: false,
        include_raw_content: true,
        include_domains: PREFERRED_DOMAINS,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TavilyResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}

/** Fallback: search without domain restriction */
async function searchTavilyGeneral(query: string): Promise<TavilyResult[]> {
  if (!TAVILY_API_KEY) return [];
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 5,
        include_answer: false,
        include_raw_content: true,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TavilyResponse;
    return data.results ?? [];
  } catch {
    return [];
  }
}

interface StructuredSummary {
  sections: {
    title: string;
    brief: string;
    detail: string;
  }[];
}

async function summarizeWithClaude(companyName: string, transcriptContent: string): Promise<StructuredSummary> {
  const fallback: StructuredSummary = {
    sections: [
      { title: '실적', brief: `${companyName} 실적 데이터를 구조화할 수 없습니다.`, detail: '원문을 확인해주세요.' },
      { title: '시장 전망 및 가이던스', brief: '데이터 부족', detail: '원문을 확인해주세요.' },
      { title: '투자현황 (CapEx)', brief: '데이터 부족', detail: '원문을 확인해주세요.' },
    ],
  };
  if (!ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `당신은 반도체 산업 애널리스트입니다. 다음은 ${companyName}의 최근 실적 발표(Earnings Call) 관련 내용입니다.

중요: 반드시 아래 JSON 형식으로만 응답하세요. 마크다운이나 설명 없이 순수 JSON만 출력하세요.
중요: 모든 내용은 반드시 한국어로 작성하세요. 영어로 작성하지 마세요.
중요: 원문이 영어/중국어라도 한국어로 번역하여 요약하세요.
중요: 데이터가 부족해도 가용한 정보로 최대한 채워주세요.

{"sections":[{"title":"실적","brief":"매출/영업이익 핵심 수치 1줄","detail":"매출, 영업이익, 마진율, 전분기/전년 대비 변화 2~3줄"},{"title":"시장 전망 및 가이던스","brief":"향후 전망 1줄","detail":"경영진 가이던스, 수요 전망, 시장 트렌드 2~3줄"},{"title":"투자현황 (CapEx)","brief":"설비투자 핵심 1줄","detail":"CapEx 규모, 투자 방향, 신규 팹/공정 계획 2~3줄"}]}

내용:
${transcriptContent}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === 'text');
    const raw = textBlock?.text ?? '';
    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as StructuredSummary;
      if (parsed.sections && parsed.sections.length > 0) return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Determine the latest completed quarter label */
function getLatestQuarterLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear() % 100;
  let q: number, y: number;
  if (month <= 3) { q = 4; y = year - 1; }
  else if (month <= 6) { q = 1; y = year; }
  else if (month <= 9) { q = 2; y = year; }
  else { q = 3; y = year; }
  return `${q}Q${y}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer');

  if (!customerId || !TRANSCRIPT_QUERIES[customerId]) {
    return NextResponse.json({ error: 'Invalid customer' }, { status: 400 });
  }

  const cacheKey = `transcript_${customerId}`;

  // Check file/memory cache (24h TTL)
  const cached = await getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Check DB cache (persistent across deploys)
  try {
    const dbRows = await queryMetrics('transcript-cache', { customer: customerId });
    if (dbRows.length > 0) {
      const row = dbRows[dbRows.length - 1];
      if (row.metadata) {
        const dbCached = JSON.parse(row.metadata);
        // Also set file cache for faster subsequent reads
        await setCache(cacheKey, dbCached);
        return NextResponse.json(dbCached);
      }
    }
  } catch { /* DB not available, continue to live fetch */ }

  const { queryEn, companyName } = TRANSCRIPT_QUERIES[customerId];
  const quarterLabel = getLatestQuarterLabel();

  // Build quarter-specific search query (e.g., "Q4 2025" for 4Q25)
  const qNum = quarterLabel.charAt(0);
  const qYear = `20${quarterLabel.slice(2)}`;
  const quarterSearch = `Q${qNum} ${qYear}`;

  // Search preferred domains first with quarter-specific query
  let results = await searchTavily(`${companyName} ${quarterSearch} earnings call transcript`);
  // Fallback: try without quarter restriction on preferred domains
  if (results.length === 0) {
    results = await searchTavily(queryEn);
  }
  // Final fallback: general search
  if (results.length === 0) {
    results = await searchTavilyGeneral(`${companyName} ${quarterSearch} earnings call transcript revenue`);
  }

  if (results.length === 0) {
    // No results — return placeholder
    const fallback = {
      quarter: quarterLabel,
      summary: `${companyName}의 최근 실적 발표 데이터를 가져올 수 없습니다. Tavily API 키를 확인해주세요.`,
      excelUrl: '',
      pdfUrl: '',
      sources: [],
    };
    return NextResponse.json(fallback);
  }

  // Filter out low-quality results (navigation menus, very short content)
  const qualityResults = results.filter((r) => {
    const text = r.raw_content || r.content || '';
    // Skip if too short or looks like navigation
    if (text.length < 100) return false;
    if (text.includes('Sign in') && text.includes('Mail') && text.length < 500) return false;
    return true;
  });

  const finalResults = qualityResults.length > 0 ? qualityResults : results;

  // Combine top results content for summarization (prefer raw_content for more detail)
  const combinedContent = finalResults
    .map((r) => `[${r.title}]\n${r.raw_content || r.content}`)
    .join('\n\n')
    .slice(0, 8000); // Limit context size

  // Summarize with Claude (structured)
  const structured = await summarizeWithClaude(companyName, combinedContent);

  // Use first result URL as PDF link (most relevant source)
  const pdfUrl = finalResults[0]?.url ?? '';

  // Build plain summary for backwards compatibility
  const summary = structured.sections.map((s) => `[${s.title}] ${s.brief}`).join('\n');

  const result = {
    quarter: quarterLabel,
    summary,
    structured,
    excelUrl: '', // Generated client-side from structured data
    pdfUrl,
    sources: finalResults.map((r) => ({ title: r.title, url: r.url })),
  };

  // Cache for 24 hours (file/memory)
  await setCache(cacheKey, result);

  // Also persist to DB so it survives deploys
  const resultJson = JSON.stringify(result);
  const dateStr = new Date().toISOString().slice(0, 10);
  try {
    const { getDb } = await import('@/lib/db');
    const db = getDb();
    db.prepare("DELETE FROM metrics WHERE tab='transcript-cache' AND customer=?").run(customerId);
    db.prepare("INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, version, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      'transcript-cache', dateStr, customerId, 'transcript_result', null, null, 0, quarterLabel, resultJson,
    );
  } catch { /* SQLite write failed */ }
  // Also try Postgres
  try {
    const { isPostgres, getPostgresUrl } = await import('@/lib/db');
    if (isPostgres()) {
      const { db: pgDb } = await import('@vercel/postgres');
      await pgDb.query("DELETE FROM metrics WHERE tab='transcript-cache' AND customer=$1", [customerId]);
      await pgDb.query(
        "INSERT INTO metrics (tab, date, customer, category, value, unit, is_estimate, version, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        ['transcript-cache', dateStr, customerId, 'transcript_result', null, null, 0, quarterLabel, resultJson],
      );
      void getPostgresUrl; // suppress unused
    }
  } catch { /* Postgres write failed */ }

  return NextResponse.json(result);
}
