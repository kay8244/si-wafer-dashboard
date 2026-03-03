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

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `다음은 "${companyName}"에 대한 최근 6개월 이내 뉴스 기사 제목 목록입니다 (최신순 정렬).

반도체/웨이퍼 산업 관점에서 핵심 동향을 주제별로 나누어 한국어로 요약해주세요.

형식 규칙:
- 반드시 각 항목을 "- "로 시작하는 개조식으로 작성
- 주제별로 하나의 항목으로 작성 (3~5개 항목)
- 각 항목은 자연스러운 완결된 한국어 문장으로 작성 (문장 중간에 끊기지 않도록)
- 각 항목 뒤에 출처 기사 번호를 [1], [2] 형식으로 표기. 여러 기사가 관련되면 [1][3] 처럼 복수 표기
- "#" 헤더나 제목줄은 사용하지 마세요

예시:
- AI 컴퓨팅 수요 증가로 인한 메모리 병목 현상이 역사적 호황기를 견인 중. [3][4]
- HBM이 실적 견인의 핵심 동력으로 작용하며, 1Q26 메모리 가격이 사상 최고 수준으로 오를 것으로 전망됨. [1][6]

기사 목록 (최신순):
${articleList}

요약:`,
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
function buildResponseCacheKey(queryKo: string, queryEn: string): string {
  return `news-full_${queryKo}_${queryEn}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 200);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const queryKo = searchParams.get('queryKo');
  const queryEn = searchParams.get('queryEn');
  const companyName = searchParams.get('companyName');

  if (!queryKo || !queryEn) {
    return NextResponse.json(
      { success: false, error: 'queryKo and queryEn are required' },
      { status: 400 },
    );
  }

  // Check full response cache first (24h TTL) — avoids RSS fetch + AI call
  const responseCacheKey = buildResponseCacheKey(queryKo, queryEn);
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
