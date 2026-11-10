'use client';

import { useMemo, useState } from 'react';
import { PREFECTURES } from '@/domain/prefectures';
import type { TargetSchool } from '@/domain/types';
import { listTargetRegions, listTargetSchools, updateTargetSchoolInfo } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Located = { prefCode: string; prefName: string; region: { code: string; name: string }[] };
type Quota = { limit: number; remaining: number; enabled: boolean };
const PAGE = 100;
const hostOf = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

const INFO_FIELDS: [keyof TargetSchool, string][] = [
  ['hensachi', '偏差値'], ['courses', '学科・コース'], ['examSchedule', '入試日程'],
  ['examSubjects', '試験科目'], ['competition', '倍率'], ['careerNote', '備考（向いている進路・強い業種）'],
];

export default function TargetSchoolsPage() {
  const { data, error, reload } = useLoad(async () => {
    const [schools, regions, quota] = await Promise.all([
      listTargetSchools(), listTargetRegions(),
      fetch('/api/target-schools/quota/research').then((r) => r.json() as Promise<Quota>).catch(() => null),
    ]);
    return { schools, regions, quota };
  });
  const [located, setLocated] = useState<Located | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [kind, setKind] = useState('');
  const [pref, setPref] = useState('');
  const [est, setEst] = useState('');
  const [q, setQ] = useState('');
  const [onlyResearched, setOnlyResearched] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [detail, setDetail] = useState<TargetSchool | null>(null);

  const filtered = useMemo(() => (data?.schools ?? []).filter((s) =>
    (!kind || s.kind === kind) && (!pref || s.prefCode === pref) && (!est || s.establishment === est)
    && (!q || s.name.includes(q) || s.address.includes(q)) && (!onlyResearched || s.researchedAt)), [data, kind, pref, est, q, onlyResearched]);

  function locate() {
    if (!navigator.geolocation) return setNotice({ ok: false, text: 'このブラウザでは位置情報を使えません' });
    setBusy('locate');
    setNotice(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const res = await fetch(`/api/target-schools/locate?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      const body = await res.json().catch(() => ({}));
      setBusy(null);
      if (!res.ok) return setNotice({ ok: false, text: body.error ?? '位置情報から県を特定できませんでした' });
      setLocated(body);
    }, (e) => {
      setBusy(null);
      setNotice({ ok: false, text: e.code === e.PERMISSION_DENIED ? '位置情報の利用が許可されていません。ブラウザの設定で許可してください。' : '位置情報を取得できませんでした' });
    }, { timeout: 15000 });
  }

  async function sync(prefCode?: string) {
    setBusy(prefCode ? 'register' : 'sync');
    setNotice(null);
    const res = await fetch('/api/target-schools/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(prefCode ? { prefCode } : {}),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setNotice({ ok: false, text: body.error ?? `失敗しました（${res.status}）` });
    setLocated(null);
    setNotice({ ok: true, text: `${body.prefectures.join('・')} の学校を最新情報にしました（私立中学 ${body.juniorHigh}校、高校 ${body.highSchool}校${body.closed ? `、閉校 ${body.closed}校` : ''}）` });
    reload();
  }

  async function research(s: TargetSchool) {
    setBusy(s.id);
    const res = await fetch(`/api/target-schools/${s.id}/research`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setNotice({ ok: false, text: body.error ?? '調査に失敗しました' }); reload(); return; }
    setNotice({ ok: true, text: `${s.name} をAIで調べました` });
    const fresh = (await listTargetSchools()).find((x) => x.id === s.id) ?? null;
    if (detail?.id === s.id) setDetail(fresh);
    reload();
  }

  async function saveDetail() {
    if (!detail) return;
    await updateTargetSchoolInfo(detail.id, detail);
    setDetail(null);
    reload();
  }

  const quotaText = !data?.quota ? '' : !data.quota.enabled ? 'AIの設定（APIキー）がまだ行われていません'
    : `AI調査の本日の残り：${data.quota.remaining} / ${data.quota.limit} 校（デモ全体で共通）`;

  return (
    <>
      <PageTitle action={
        <div className="flex gap-2">
          <Button variant="ghost" disabled={!!busy} onClick={locate}>{busy === 'locate' ? '取得中…' : '現在地を取得'}</Button>
          <Button disabled={!!busy || !data?.regions.length} onClick={() => sync()}>{busy === 'sync' ? '更新中…（1分ほど）' : '最新情報に更新'}</Button>
        </div>
      }>
        志望校 <span className="text-sm font-normal text-slate-500">{data ? `${filtered.length}校` : ''}</span>
      </PageTitle>
      <p className="mb-3 text-sm text-slate-500">
        文部科学省の学校コード一覧から、私立中学と高校を登録します。「AIで調べる」で偏差値・入試情報・向いている進路などを調べられます（内容は出典で確認してください）。
        {data?.regions.length ? <>　登録済みの地域：{data.regions.map((c) => PREFECTURES[c]).join('・')}</> : null}
      </p>

      {located && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-indigo-200 bg-indigo-50 p-4">
          <div className="text-sm text-indigo-900">
            現在地は <b>{located.prefName}</b> です。登録する地域：{located.region.map((r) => r.name).join('・')}
          </div>
          <Button disabled={!!busy} onClick={() => sync(located.prefCode)}>{busy === 'register' ? '登録中…（1分ほど）' : 'この地域の学校を登録'}</Button>
        </div>
      )}
      {notice && <p className={`mb-4 rounded-lg p-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>}
      <ErrorText error={error} />

      {data && data.schools.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          まだ学校が登録されていません。「現在地を取得」を押して、表示された地域を登録してください。
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <select className={`${inputCls} max-w-28`} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">中学・高校</option><option>中学</option><option>高校</option>
            </select>
            <select className={`${inputCls} max-w-36`} value={pref} onChange={(e) => setPref(e.target.value)}>
              <option value="">全地域</option>
              {data?.regions.map((c) => <option key={c} value={c}>{PREFECTURES[c]}</option>)}
            </select>
            <select className={`${inputCls} max-w-28`} value={est} onChange={(e) => setEst(e.target.value)}>
              <option value="">国公私立</option><option>国立</option><option>公立</option><option>私立</option>
            </select>
            <input className={`${inputCls} max-w-60`} placeholder="学校名・住所で検索" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
            <label className="flex items-center gap-1"><input type="checkbox" className="accent-indigo-600" checked={onlyResearched} onChange={(e) => setOnlyResearched(e.target.checked)} />調査済みのみ</label>
            <span className="ml-auto text-xs text-slate-500">{quotaText}</span>
          </div>
          <Table head={['学校名', '種別', '所在地', '偏差値', '備考', '']}>
            {filtered.slice(0, limit).map((s) => (
              <tr key={s.id} className={s.closed ? 'opacity-50' : ''}>
                <td className="px-4 py-2">
                  <button className="whitespace-nowrap text-left font-medium text-indigo-700 hover:underline" onClick={() => setDetail(s)}>{s.name}</button>
                  {s.closed && <span className="ml-2 rounded bg-slate-200 px-1.5 text-xs">閉校</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{s.establishment}{s.kind}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{s.address}</td>
                <td className="px-4 py-2"><div className="line-clamp-2 max-w-48 text-xs" title={s.hensachi}>{s.hensachi || <span className="text-slate-300">—</span>}</div></td>
                <td className="px-4 py-2 text-xs text-slate-600"><div className="line-clamp-2 max-w-xl" title={s.careerNote}>{s.careerNote}</div></td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Button variant="ghost" disabled={!!busy || s.closed || !data?.quota?.enabled || data.quota.remaining === 0} onClick={() => research(s)}>
                    {busy === s.id ? '調査中…（1分ほど）' : s.researchedAt ? 'AIで再調査' : 'AIで調べる'}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">該当する学校がありません</td></tr>}
          </Table>
          {filtered.length > limit && (
            <div className="mt-3 text-center"><Button variant="ghost" onClick={() => setLimit(limit + PAGE)}>さらに表示（残り {filtered.length - limit}校）</Button></div>
          )}
        </>
      )}

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} size="xl">
          <div className="-mt-2 mb-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-800">{PREFECTURES[detail.prefCode]}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{detail.establishment}{detail.kind}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">〒{detail.postal} {detail.address}</span>
            <span className={`rounded-full px-3 py-1 ${detail.researchedAt ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              {detail.researchedAt ? `AI調査：${new Date(detail.researchedAt).toLocaleDateString('ja-JP')}` : 'AI未調査'}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="grid gap-4 md:grid-cols-2">
              {INFO_FIELDS.map(([k, label]) => (
                <div key={k} className={k === 'careerNote' || k === 'examSchedule' ? 'md:col-span-2' : ''}>
                  <Field label={label}>
                    {/* 内容の行数に合わせて高さを伸ばす（スクロールせずに全文が読める） */}
                    <textarea
                      className={`${inputCls} resize-y text-[15px] leading-relaxed`}
                      rows={Math.max(k === 'careerNote' ? 5 : 3, Math.ceil(String(detail[k] ?? '').length / (k === 'careerNote' || k === 'examSchedule' ? 70 : 32)) + 1)}
                      value={String(detail[k] ?? '')}
                      placeholder="未入力"
                      onChange={(e) => setDetail({ ...detail, [k]: e.target.value })} />
                  </Field>
                </div>
              ))}
            </div>

            <aside className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-sm font-bold text-slate-700">出典（{detail.sources.length}件）</p>
              {detail.sources.length === 0 ? (
                <p className="text-sm text-slate-400">AIで調べると、参照したページがここに並びます。</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {detail.sources.map((src, i) => (
                    <li key={src.url} className="flex gap-2">
                      <span className="shrink-0 text-slate-400">{i + 1}.</span>
                      <a href={src.url} target="_blank" rel="noreferrer noopener" className="min-w-0 text-indigo-700 hover:underline">
                        <span className="block leading-snug">{src.title || src.url}</span>
                        <span className="block truncate text-xs text-slate-400">{hostOf(src.url)}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-xs text-slate-500">AIの調査結果は誤りを含むことがあります。出典で確認し、必要に応じて直してください。</p>
            </aside>
          </div>
          <div className="mt-6 flex justify-between gap-2 border-t pt-4">
            <Button variant="ghost" disabled={!!busy || detail.closed || !data?.quota?.enabled || data.quota.remaining === 0} onClick={() => research(detail)}>
              {busy === detail.id ? 'AIが調査中…' : detail.researchedAt ? 'AIで再調査' : 'AIで調べる'}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDetail(null)}>閉じる</Button>
              <Button onClick={saveDetail}>保存</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
