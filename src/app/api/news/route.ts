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
          content: `다음은 "${companyName}"에 대한 최근 6개월 이내 뉴스 기사 제목 목록입니다 (최신순 정렬). 가장 최근 기사들을 중심으로 핵심 동향을 3~4줄로 한국어 요약해주세요. 반도체 웨이퍼 산업 관점에서 중요한 포인트와 최신 트렌드를 중심으로 작성하세요.

중요: 각 사실이나 주장 뒤에 해당 정보의 출처 기사 번호를 [1], [2] 형식으로 반드시 표기하세요. 여러 기사가 관련되면 [1][3] 처럼 복수 표기하세요.

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

    return NextResponse.json({ success: true, answer, articles });
  } catch (err) {
    console.error('News fetch error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news' },
      { status: 500 },
    );
  }
}
