import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getCached, setCache } from '@/lib/cache';

const SYSTEM_PROMPT = `당신은 데이터 해석 도우미입니다. 제공된 숫자 데이터만 근거로 간결하게 분석합니다.

출력 형식 (엄격히 준수):
- 지표별 분석은 "● 지표명" 으로 시작 (●로 시작하는 줄은 상위 항목)
- 세부 내용은 "- " 로 시작, 1~2문장 이내
- 상관관계는 "● 상관관계" 아래에 "- 지표A ↔ 내부데이터B (r=값): 해석" 형식
- 제목/헤더(#) 사용 금지. **볼드** 사용 금지.

분석 규칙:
- 제공된 숫자만 인용. 추측/외부 정보/일반론 절대 금지
- 각 지표: 12개월 추세 요약 + 전월대비 변화(MoM) 반드시 포함 (예: "전월대비 +0.18p 상승, 12개월간 100.05→100.58 완만한 상승세")
- 오버레이(내부 데이터)도 동일하게 추세 + 전월대비 변화 포함
- 상관계수 해석: |r|≥0.8 강한, ≥0.6 보통, ≥0.4 약한, <0.4 미약
- 한국어, 최대한 짧게`;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { tab, context } = body as { tab: string; context: string };

    if (!tab || !context) {
      return NextResponse.json({ error: 'tab and context are required' }, { status: 400 });
    }

    // Cache key based on tab + hash of full context (avoids truncation collisions)
    const hash = crypto.createHash('md5').update(context).digest('hex').slice(0, 16);
    const cacheKey = `ai-insight_${tab}_${hash}`;
    const cached = await getCached<string>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, insight: cached });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const insight = textBlock?.text ?? null;

    if (insight) {
      await setCache(cacheKey, insight);
    }

    return NextResponse.json({ success: true, insight });
  } catch (err) {
    console.error('[ai-insight] error:', err);
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
  }
}
