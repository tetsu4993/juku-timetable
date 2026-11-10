import Anthropic from '@anthropic-ai/sdk';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { jstDay } from '@/domain/ai-test';
import { PREFECTURES } from '@/domain/prefectures';
import { extractResearch, RESEARCH_DAILY_LIMIT } from '@/domain/school-research';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

const SYSTEM = `あなたは日本の学習塾の進路指導担当です。指定された学校について、Web検索で公式サイトや信頼できる受験情報サイトを確認し、塾の先生が志望校指導に使う情報をまとめてください。
- 分からない項目は推測で埋めず「不明」と書く。年度が分かる情報は年度を書く
- hensachi：偏差値の目安（出典により幅があれば範囲で）
- courses：学科・コース
- exam_schedule：直近の入試日程（推薦・一般など）
- exam_subjects：試験科目・面接や作文の有無
- competition：直近の倍率
- career_note：卒業生の主な進路、どんな進路・職業を目指す生徒に向いているか。専門学科があれば、どの業種・資格に強いか
最後に、次のキーだけを持つJSONを \`\`\`json のコードブロックで出力してください：hensachi, courses, exam_schedule, exam_subjects, competition, career_note（値はすべて日本語の文字列）`;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.ANTHROPIC_API_KEY || !url || !key) {
    return NextResponse.json({ error: 'AIの設定（APIキー）がまだ行われていません' }, { status: 503 });
  }
  const sb = createAdmin(url, key, { auth: { persistSession: false } });

  const { data: school } = await supabase.from('target_schools').select('*').eq('id', id).single();
  if (!school) return NextResponse.json({ error: '学校が見つかりません' }, { status: 404 });

  const day = jstDay(new Date());
  const { data: allowed, error: quotaError } = await sb.rpc('consume_ai_quota_kind', { p_day: day, p_kind: 'research', p_limit: RESEARCH_DAILY_LIMIT });
  if (quotaError) return NextResponse.json({ error: '回数の確認に失敗しました' }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: `本日の上限（${RESEARCH_DAILY_LIMIT}校）に達しました。明日またお試しください。` }, { status: 429 });
  const refund = () => sb.rpc('refund_ai_quota_kind', { p_day: day, p_kind: 'research' });

  try {
    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = [{
      role: 'user',
      content: `${PREFECTURES[school.pref_code]}の${school.establishment}${school.kind === '中学' ? '中学校' : '高校'}「${school.name}」（所在地：${school.address}）について調べてください。`,
    }];
    const sources = new Map<string, string>();
    let text = '';
    // サーバー側のWeb検索が長くなると pause_turn で一度止まるので、続きを依頼する（最大5回）
    for (let turn = 0; turn < 5; turn++) {
      const response = await client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: 'medium' },
        system: SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6, user_location: { type: 'approximate', country: 'JP' } }],
        messages,
      });
      for (const block of response.content) {
        if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          for (const r of block.content) if (r.type === 'web_search_result') sources.set(r.url, r.title);
        }
        if (block.type === 'text') text += block.text;
      }
      if (response.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: response.content });
        continue;
      }
      if (response.stop_reason === 'refusal') throw new Error('refusal');
      break;
    }

    const research = extractResearch(text);
    if (!research) {
      await refund();
      return NextResponse.json({ error: 'AIの調査結果を読み取れませんでした。もう一度お試しください。' }, { status: 502 });
    }
    const { error } = await supabase.from('target_schools').update({
      ...research,
      sources: [...sources].slice(0, 10).map(([u, title]) => ({ url: u, title })),
      researched_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await refund();
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'AIが混み合っています。少し待ってお試しください。' }, { status: 503 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'AIのAPIキーが正しくありません' }, { status: 503 });
    console.error('research failed', e);
    return NextResponse.json({ error: '調査に失敗しました' }, { status: 500 });
  }
}

/** 今日の残り回数 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = url && key ? createAdmin(url, key, { auth: { persistSession: false } }) : null;
  const { data } = sb ? await sb.from('ai_usage').select('count').eq('day', jstDay(new Date())).eq('kind', 'research').maybeSingle() : { data: null };
  return NextResponse.json({
    limit: RESEARCH_DAILY_LIMIT,
    remaining: Math.max(0, RESEARCH_DAILY_LIMIT - (data?.count ?? 0)),
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
