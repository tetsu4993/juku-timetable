import { NextResponse } from 'next/server';
import { prefFromMuniCode } from '@/domain/mext';
import { PREFECTURES, regionFor } from '@/domain/prefectures';
import { createClient } from '@/lib/supabase/server';

/** 緯度・経度 → 都道府県と、登録対象（県内＋隣県）。国土地理院の住所検索を使う */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインしてください' }, { status: 401 });

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  // 日本の範囲だけ受け付ける
  if (!(lat > 20 && lat < 46 && lon > 122 && lon < 154)) {
    return NextResponse.json({ error: '日本国内の位置情報ではありません' }, { status: 400 });
  }
  const res = await fetch(`https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`, { cache: 'no-store' });
  const body = await res.json().catch(() => null);
  const pref = prefFromMuniCode(String(body?.results?.muniCd ?? ''));
  if (!pref) return NextResponse.json({ error: '都道府県を特定できませんでした' }, { status: 502 });
  return NextResponse.json({
    prefCode: pref,
    prefName: PREFECTURES[pref],
    region: regionFor(pref).map((code) => ({ code, name: PREFECTURES[code] })),
  });
}
