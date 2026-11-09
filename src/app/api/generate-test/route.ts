import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_DAILY_LIMIT, DIFFICULTIES, jstDay, parseTestRequest, testTypesFor } from '@/domain/ai-test';
import { createClient } from '@/lib/supabase/server';

// AIの応答を待つ時間（秒）。Vercel の関数の上限時間
export const maxDuration = 120;

// AIの回答の形（構造化出力で、この形のJSONだけを返させる）
const TestSchema = z.object({
  title: z.string(),
  questions: z.array(z.object({
    unit: z.string(),
    question: z.string(),
    choices: z.array(z.string()),
    answer: z.string(),
    explanation: z.string(),
  })),
});

const SYSTEM = `あなたは日本の学習塾で定期テスト対策の問題を作る講師です。
指定された学年・科目・教科書の単元名をもとに、その範囲の定期テストで出題されそうな練習問題を作ってください。
- 教科書の本文や問題文をそのまま再現せず、学習内容に沿ったオリジナルの問題にする
- 学年の学習指導要領の範囲を超えない
- 問題は日本語。英語の科目では英文を含めてよい
- 選択問題なら choices に選択肢を入れ、記述・計算問題なら choices は空配列にする
- answer は正解、explanation は生徒向けに1〜2文で簡潔に
- unit には、その問題がどの単元のものかを、指定された単元名のどれかで書く`;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createAdmin(url, key, { auth: { persistSession: false } }) : null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const parsed = parseTestRequest(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { materialId, unitIds, count, difficulty } = parsed.value;

  const sb = admin();
  if (!process.env.ANTHROPIC_API_KEY || !sb) {
    return NextResponse.json({ error: 'AIの設定（APIキー）がまだ行われていません' }, { status: 503 });
  }

  // 教材と単元（ログインユーザーの権限で読む）
  const { data: material } = await supabase.from('school_materials')
    .select('name, publisher, grade, subject, schools(name)').eq('id', materialId).single();
  const { data: units } = await supabase.from('material_units')
    .select('id, name, sort_order').eq('material_id', materialId).in('id', unitIds).order('sort_order');
  if (!material || !units || units.length !== unitIds.length) {
    return NextResponse.json({ error: '教材または範囲が見つかりません' }, { status: 404 });
  }
  // テストの種類は、その教材の科目にあるものだけ受け付ける
  const checked = parseTestRequest(parsed.value, material.subject);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const testType = testTypesFor(material.subject).find((t) => t.key === checked.value.testType)!;

  // 1日の上限（全体で AI_DAILY_LIMIT 回）。同時に押されても超えない
  const day = jstDay(new Date());
  const { data: allowed, error: quotaError } = await sb.rpc('consume_ai_quota', { p_day: day, p_limit: AI_DAILY_LIMIT });
  if (quotaError) return NextResponse.json({ error: '回数の確認に失敗しました' }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: `本日の上限（${AI_DAILY_LIMIT}回）に達しました。明日またお試しください。` }, { status: 429 });

  const unitNames = units.map((u) => u.name);
  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: zodOutputFormat(TestSchema) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          `学年：${material.grade}`,
          `科目：${material.subject}`,
          `教材：${material.name}${material.publisher ? `（${material.publisher}）` : ''}`,
          `範囲（単元）：\n${unitNames.map((n) => `- ${n}`).join('\n')}`,
          `テストの種類：${testType.label}（${testType.instruction}）`,
          `難易度：${DIFFICULTIES[difficulty]}`,
          `問題数：${count}問`,
          `タイトルは「（学年）（科目） ${testType.label === '総合' ? '' : `${testType.label}`}疑似テスト」の形にしてください。`,
        ].join('\n'),
      }],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      await sb.rpc('refund_ai_quota', { p_day: day });
      return NextResponse.json({ error: 'AIが問題を作れませんでした。範囲を変えてお試しください。' }, { status: 502 });
    }

    const test = response.parsed_output;
    const { data: saved, error } = await supabase.from('generated_tests').insert({
      material_id: materialId, unit_names: unitNames, difficulty, test_type: testType.key,
      title: test.title, questions: test.questions.slice(0, count),
    }).select('id').single();
    if (error || !saved) throw new Error(error?.message ?? 'save failed');
    return NextResponse.json({ id: saved.id });
  } catch (e) {
    await sb.rpc('refund_ai_quota', { p_day: day });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'AIが混み合っています。少し待ってお試しください。' }, { status: 503 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'AIのAPIキーが正しくありません' }, { status: 503 });
    console.error('generate-test failed', e);
    return NextResponse.json({ error: '問題の作成に失敗しました' }, { status: 500 });
  }
}

/** 今日の残り回数 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });
  const sb = admin();
  const { data } = sb ? await sb.from('ai_usage').select('count').eq('day', jstDay(new Date())).maybeSingle() : { data: null };
  return NextResponse.json({
    limit: AI_DAILY_LIMIT,
    remaining: Math.max(0, AI_DAILY_LIMIT - (data?.count ?? 0)),
    enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
