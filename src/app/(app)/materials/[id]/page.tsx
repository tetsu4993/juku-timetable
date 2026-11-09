'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { DIFFICULTIES, QUESTION_COUNTS, splitUnitLines, type Difficulty } from '@/domain/ai-test';
import type { MaterialUnit } from '@/domain/types';
import {
  addMaterialUnits, deleteGeneratedTest, deleteMaterialUnit, getSchoolMaterial, listGeneratedTests, listMaterialUnits, renameMaterialUnit,
} from '@/lib/repo';
import { Button, ErrorText, inputCls, Modal, PageTitle, useLoad } from '@/components/ui';

type Quota = { limit: number; remaining: number; enabled: boolean };

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, reload } = useLoad(async () => {
    const [material, units, tests, quota] = await Promise.all([
      getSchoolMaterial(id), listMaterialUnits(id), listGeneratedTests(id),
      fetch('/api/generate-test').then((r) => r.json() as Promise<Quota>).catch(() => null),
    ]);
    return { material, units, tests, quota };
  }, [id]);
  const [checked, setChecked] = useState<string[]>([]);
  const [count, setCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [bulk, setBulk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.material) return <p>教材が見つかりません。<Link href="/schools" className="text-indigo-600">学校一覧へ</Link></p>;
  const { material, units, tests, quota } = data;
  const allChecked = units.length > 0 && units.every((u) => checked.includes(u.id));

  async function addBulk() {
    const names = splitUnitLines(bulk ?? '');
    if (!names.length) return setBulk(null);
    await addMaterialUnits(id, names, Math.max(0, ...units.map((u) => u.sortOrder)));
    setBulk(null);
    reload();
  }
  async function rename(u: MaterialUnit) {
    const name = prompt('単元名', u.name)?.trim();
    if (name && name !== u.name) { await renameMaterialUnit(u.id, name); reload(); }
  }
  async function remove(u: MaterialUnit) {
    if (!confirm(`「${u.name}」を目次から削除しますか？`)) return;
    await deleteMaterialUnit(u.id);
    setChecked(checked.filter((x) => x !== u.id));
    reload();
  }
  async function generate() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/generate-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: id, unitIds: checked, count, difficulty }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage(body.error ?? `作成できませんでした（${res.status}）`); reload(); return; }
      router.push(`/materials/${id}/tests/${body.id}`);
    } finally { setBusy(false); }
  }
  async function removeTest(tid: string) {
    if (!confirm('この疑似テストを削除しますか？')) return;
    await deleteGeneratedTest(tid);
    reload();
  }

  return (
    <>
      <PageTitle>{material.name} <span className="text-base font-normal text-slate-500">{material.grade} {material.subject}{material.publisher ? `・${material.publisher}` : ''}</span></PageTitle>
      <p className="mb-4 text-sm"><Link href={`/schools/${material.schoolId}`} className="text-indigo-600 hover:underline">← 教材一覧</Link></p>
      <ErrorText error={error} />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">目次（単元）</h2>
            <div className="flex gap-2">
              {units.length > 0 && (
                <Button variant="ghost" onClick={() => setChecked(allChecked ? [] : units.map((u) => u.id))}>
                  {allChecked ? 'すべて外す' : 'すべて選ぶ'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setBulk('')}>＋ 単元を追加</Button>
            </div>
          </div>
          {units.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
              まだ目次がありません。「＋ 単元を追加」から、教科書の目次（単元名）を1行に1つずつ貼り付けてください。
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {units.map((u) => (
                <li key={u.id} className="group flex items-center gap-3 py-2">
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" className="size-4 accent-indigo-600" checked={checked.includes(u.id)}
                      onChange={(e) => setChecked(e.target.checked ? [...checked, u.id] : checked.filter((x) => x !== u.id))} />
                    <span className="text-sm">{u.name}</span>
                  </label>
                  <span className="invisible flex gap-1 group-hover:visible">
                    <button className="text-xs text-slate-500 hover:text-indigo-600" onClick={() => rename(u)}>名前変更</button>
                    <button className="text-xs text-red-500 hover:text-red-700" onClick={() => remove(u)}>削除</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="card p-4">
            <h2 className="mb-1 font-bold">疑似テストを作る</h2>
            <p className="mb-3 text-xs text-slate-500">チェックした範囲から、AI（Claude）が定期テスト形式の練習問題を作ります。</p>
            <div className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">範囲：{checked.length} 単元を選択中</div>
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <label>問題数
                <select className={inputCls} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {QUESTION_COUNTS.map((n) => <option key={n} value={n}>{n}問</option>)}
                </select>
              </label>
              <label>難易度
                <select className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <Button className="w-full py-2" disabled={busy || checked.length === 0 || !quota?.enabled || quota.remaining === 0} onClick={generate}>
              {busy ? 'AIが問題を作成中…（30秒ほど）' : 'この範囲で疑似テストを作る'}
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              {!quota ? '' : !quota.enabled ? 'AIの設定（APIキー）がまだ行われていません。'
                : `本日の残り：${quota.remaining} / ${quota.limit} 回（デモ全体で共通）`}
            </p>
            {message && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{message}</p>}
          </section>

          <section className="card p-4">
            <h2 className="mb-2 font-bold">作成した疑似テスト</h2>
            {tests.length === 0 ? <p className="text-sm text-slate-400">まだありません</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {tests.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/materials/${id}/tests/${t.id}`} className="min-w-0 text-indigo-600 hover:underline">
                      <div className="truncate">{t.title}</div>
                      <div className="truncate text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        ・{t.questions.length}問・{t.unitNames.join('、')}
                      </div>
                    </Link>
                    <button className="shrink-0 text-xs text-red-500 hover:text-red-700" onClick={() => removeTest(t.id)}>削除</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {bulk !== null && (
        <Modal title="単元を追加" onClose={() => setBulk(null)}>
          <p className="mb-2 text-sm text-slate-500">教科書の目次の単元名を、1行に1つずつ入力（貼り付け）してください。今の目次の末尾に追加されます。</p>
          <textarea className={`${inputCls} h-56 font-mono`} placeholder={'1章 正の数と負の数\n2章 文字の式\n3章 方程式'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulk(null)}>キャンセル</Button>
            <Button onClick={addBulk}>追加（{splitUnitLines(bulk).length}件）</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
