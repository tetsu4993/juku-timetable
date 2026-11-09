'use client';

import { useState } from 'react';
import type { Period } from '@/domain/types';
import { deletePeriod, listPeriods, upsertPeriod } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Draft = Omit<Period, 'id'> & { id?: string };

export default function PeriodsPage() {
  const { data, error, reload } = useLoad(listPeriods);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('名前を入力してください');
    if (draft.start >= draft.end) return setSaveError('終了時刻は開始時刻より後にしてください');
    try {
      await upsertPeriod(draft);
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }

  async function remove(p: Period) {
    if (!confirm(`${p.name} を削除しますか？このコマの時間割も消えます。`)) return;
    await deletePeriod(p.id);
    reload();
  }

  const next = (data?.length ?? 0) + 1;

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft({ name: `${next}限`, start: '13:00', end: '14:20', sortOrder: next }); }}>＋ コマを追加</Button>}>コマ（時限）</PageTitle>
      <ErrorText error={error} />
      <Table head={['並び順', '名前', '時間', '']}>
        {data?.map((p) => (
          <tr key={p.id}>
            <td className="px-3 py-2">{p.sortOrder}</td>
            <td className="px-3 py-2 font-medium">{p.name}</td>
            <td className="px-3 py-2">{p.start}〜{p.end}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(p); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(p)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? 'コマを編集' : 'コマを追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="名前"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始"><input type="time" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
              <Field label="終了"><input type="time" className={inputCls} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
            </div>
            <Field label="並び順"><input type="number" className={inputCls} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></Field>
            <ErrorText error={saveError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>キャンセル</Button>
              <Button onClick={save}>保存</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
