import { NextResponse } from 'next/server';
import { latestCsvLinks, parseCsv, toTargetSchools } from '@/domain/mext';
import { PREFECTURES, regionFor } from '@/domain/prefectures';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;
const MEXT_PAGE = 'https://www.mext.go.jp/b_menu/toukei/mext_01087.html';

/**
 * 志望校マスタの登録・更新。
 * body.prefCode があれば、その県＋隣県を登録対象に加えてから、登録済みの全地域を文科省の最新CSVで取り直す。
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.prefCode !== undefined) {
    if (!PREFECTURES[body.prefCode]) return NextResponse.json({ error: '都道府県が正しくありません' }, { status: 400 });
    const { error } = await supabase.from('target_school_regions')
      .upsert(regionFor(body.prefCode).map((pref_code) => ({ pref_code })), { onConflict: 'pref_code', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: regions } = await supabase.from('target_school_regions').select('pref_code');
  const prefCodes = (regions ?? []).map((r) => r.pref_code as string);
  if (!prefCodes.length) return NextResponse.json({ error: '先に現在地から地域を登録してください' }, { status: 400 });

  // 文科省のページから最新のCSVを探して読み込む
  let schools;
  try {
    const page = await fetch(MEXT_PAGE, { cache: 'no-store' }).then((r) => r.text());
    const links = latestCsvLinks(page);
    if (!links.length) throw new Error('CSVのリンクが見つかりません');
    const texts = await Promise.all(links.map((u) => fetch(u, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`CSVの取得に失敗しました（${r.status}）`);
      return r.text();
    })));
    schools = texts.flatMap((t) => toTargetSchools(parseCsv(t), prefCodes));
  } catch (e) {
    return NextResponse.json({ error: `文部科学省のデータを取得できませんでした：${e instanceof Error ? e.message : e}` }, { status: 502 });
  }

  // 登録・更新（学校コードで照合。AIの調査結果は消さない）
  const now = new Date().toISOString();
  const rows = schools.map((s) => ({
    mext_code: s.code, kind: s.kind, pref_code: s.prefCode, establishment: s.establishment,
    name: s.name, address: s.address, postal: s.postal, closed: false, synced_at: now,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('target_schools').upsert(rows.slice(i, i + 500), { onConflict: 'mext_code' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // 今回のデータにない学校（廃止など）は「閉校」にする
  const { data: closed, error: closeError } = await supabase.from('target_schools').update({ closed: true })
    .in('pref_code', prefCodes).lt('synced_at', now).eq('closed', false).select('id');
  if (closeError) return NextResponse.json({ error: closeError.message }, { status: 500 });

  return NextResponse.json({
    prefectures: prefCodes.map((c) => PREFECTURES[c]),
    total: rows.length,
    juniorHigh: rows.filter((r) => r.kind === '中学').length,
    highSchool: rows.filter((r) => r.kind === '高校').length,
    closed: closed?.length ?? 0,
  });
}
