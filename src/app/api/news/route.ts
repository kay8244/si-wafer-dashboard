import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from '@/lib/cache';

interface RssArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string | null;
}

function parseGoogleNewsRss(xml: string): RssArticle[] {
  const items: RssArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
      ?? block.match(/<title>(.*?)<\/title>/)?.[1]
      ?? '';
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
    const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? '';

    if (title && link) {
      items.push({
        title,
        url: link,
        source,
        publishedDate: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }
  }

  return items;
}

async function fetchGoogleNews(query: string, lang: 'ko' | 'en'): Promise<RssArticle[]> {
  const params = lang === 'ko'
    ? 'hl=ko&gl=KR&ceid=KR:ko'
    : 'hl=en&gl=US&ceid=US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${params}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const xml = await res.text();
  return parseGoogleNewsRss(xml);
}

function mergeAndSort(koArticles: RssArticle[], enArticles: RssArticle[], max: number): RssArticle[] {
  const seen = new Set<string>();
  const all: RssArticle[] = [];

  for (const a of [...koArticles, ...enArticles]) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    all.push(a);
  }

  // 6개월 이전 기사 제외
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const filtered = all.filter((a) => {
    if (!a.publishedDate) return true; // 날짜 없으면 포함
    return new Date(a.publishedDate) >= sixMonthsAgo;
  });

  // 최신 날짜순 내림차순 정렬
  filtered.sort((a, b) => {
    const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
    const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
    return db - da;
  });

  return filtered.slice(0, max);
}

function buildSummaryCacheKey(companyName: string, articles: RssArticle[]): string {
  const titles = articles.slice(0, 10).map((a) => a.title).join('|');
  return `news-summary_${companyName}_${titles}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
}

async function generateSummary(
  companyName: string,
  articles: RssArticle[],
  context?: string,
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (articles.length === 0) return null;

  // 캐시 확인 - 기사 목록이 같으면 기존 요약 재사용
  const cacheKey = buildSummaryCacheKey(companyName, articles);
  const cached = await getCached<string>(cacheKey);
  if (cached) {
    console.log(`[News] Cache hit for ${companyName} summary`);
    return cached;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const articleList = articles
      .slice(0, 10)
      .map((a, i) => `${i + 1}. [${a.source}] ${a.title}${a.publishedDate ? ` (${new Date(a.publishedDate).toLocaleDateString('ko-KR')})` : ''}`)
      .join('\n');

    const contextInstruction = context
      ? `\n\n★ 중요: 이 요약은 "${context}" 관점의 대시보드에 표시됩니다. 헤드라인은 반드시 해당 관점에서의 임팩트/영향까지 포함해야 합니다.\n예: 단순히 "AI 서버 ASIC 칩 출하량 3배 급증"이 아니라 "AI 서버 ASIC 3배 급증 → EPI 실리콘 웨이퍼 수요 대폭 확대"처럼 해당 도메인에 미치는 영향까지 헤드라인에 담아주세요.`
      : '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `다음은 "${companyName}"에 대한 최근 뉴스 기사 제목 목록입니다.

각 기사를 헤드라인 + 상세요약 형태로 정리해주세요.${contextInstruction}

정렬 기준 (중요도순):
1. 산업 영향력이 큰 기사 (시장 전체에 영향)
2. 구체적 숫자가 있는 기사 (변화폭, 투자액, 성장률 등)
3. 최신 기사

형식 규칙:
- 반드시 "- "로 시작
- 정확히 4개 항목 (4개 초과 금지)
- 모든 항목은 반드시 "헤드라인 >>> 상세요약 [출처번호]" 형태. >>> 구분자 필수!
- 헤드라인: 최대 60자, 반드시 숫자/변화폭 포함, 해당 도메인 임팩트까지 포함
- 상세요약: 3~5문장으로 배경/맥락/전망을 상세히 설명. 구체적 수치, 주요 기업명, 시장 전망 포함
- 출처 번호: [1], [2] 형식. 여러 기사 관련시 [1][3] 복수 표기
- "#" 헤더 사용 금지
- ⚠️ 절대로 >>> 없이 헤드라인만 작성하지 마세요. 모든 항목에 >>> 뒤에 상세요약이 있어야 합니다.

예시:
- 삼성전자 D램 가격 40% 인상, 메모리 공급 우위 강화 >>> 삼성전자와 SK하이닉스가 서버향 DDR5 수요 증가에 힘입어 D램 계약가를 전분기 대비 40% 인상했다. 메모리 3사 모두 감산 기조를 유지하며 공급 우위를 확보하는 전략이다. 이에 따라 웨이퍼 수급도 타이트해질 전망이며, 특히 HBM용 고순도 웨이퍼 수요가 급증하고 있다. [1][3]
- TSMC CapEx $38B 역대 최대 → 파운드리 웨이퍼 수요 급증 >>> TSMC가 2025년 설비투자를 $38B으로 확대하며 역대 최대 규모를 기록했다. AI칩 수요 대응을 위한 CoWoS 패키징 캐파를 2배로 늘리는 것이 핵심이다. 이로 인해 300mm 웨이퍼 수요가 추가로 월 5만장 이상 증가할 것으로 예상된다. [2][5]

기사 목록:
${articleList}

헤드라인 요약:`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const summary = textBlock ? textBlock.text : null;

    // 요약 결과 캐시 저장 (24시간 TTL)
    if (summary) {
      await setCache(cacheKey, summary);
      console.log(`[News] Cached summary for ${companyName}`);
    }

    return summary;
  } catch (err) {
    console.error('Anthropic summary error:', err);
    return null;
  }
}

/** Build a stable cache key for the full news response (articles + summary) */
function buildResponseCacheKey(queryKo: string, queryEn: string, context?: string): string {
  const base = context
    ? `news-full_${queryKo}_${queryEn}_${context}`
    : `news-full_${queryKo}_${queryEn}`;
  return base.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const queryKo = searchParams.get('queryKo');
  const queryEn = searchParams.get('queryEn');
  const companyName = searchParams.get('companyName');
  const context = searchParams.get('context');

  if (!queryKo || !queryEn) {
    return NextResponse.json(
      { success: false, error: 'queryKo and queryEn are required' },
      { status: 400 },
    );
  }

  // Check full response cache first (24h TTL) — avoids RSS fetch + AI call
  const responseCacheKey = buildResponseCacheKey(queryKo, queryEn, context ?? undefined);
  const cachedResponse = await getCached<{ answer: string | null; articles: RssArticle[] }>(responseCacheKey);
  if (cachedResponse) {
    console.log(`[News] Full response cache hit for "${queryKo}"`);
    return NextResponse.json({ success: true, ...cachedResponse });
  }

  try {
    const [koArticles, enArticles] = await Promise.all([
      fetchGoogleNews(queryKo, 'ko'),
      fetchGoogleNews(queryEn, 'en'),
    ]);

    const articles = mergeAndSort(koArticles, enArticles, 10);

    const answer = await generateSummary(
      companyName ?? queryKo,
      articles,
      context ?? undefined,
    );

    // Cache full response for 24 hours (1 fetch per day per query)
    await setCache(responseCacheKey, { answer, articles });
    console.log(`[News] Cached full response for "${queryKo}"`);

    return NextResponse.json({ success: true, answer, articles });
  } catch (err) {
    console.error('News fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news' },
      { status: 500 },
    );
  }
}
