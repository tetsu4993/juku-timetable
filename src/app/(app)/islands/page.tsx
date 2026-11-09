'use client';

import { useState } from 'react';
import type { Island } from '@/domain/types';
import { deleteIsland, listIslands, upsertIsland } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Draft = Omit<Island, 'id'> & { id?: string };

export default function IslandsPage() {
  const { data, error, reload } = useLoad(listIslands);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('名前を入力してください');
    try { await upsertIsland({ ...draft, name: draft.name.trim() }); setDraft(null); reload(); } catch (e) { setSaveError(String(e)); }
  }
  async function remove(x: Island) {
    if (!confirm(`${x.name} を削除しますか？時間割・テンプレートでのこの島の割り当ても消えます。`)) return;
    await deleteIsland(x.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft({ name: '', sortOrder: (data?.length ?? 0) + 1 }); }}>＋ 島を追加</Button>}>島（場所）</PageTitle>
      <p className="mb-3 text-sm text-slate-500">教室内の机のまとまりです。時間割・テンプレートの各マス（コマ×先生）で、どの島を使うかを選べます。</p>
      <ErrorText error={error} />
      <Table head={['並び順', '名前', '']}>
        {data?.map((x) => (
          <tr key={x.id}>
            <td className="w-24 px-4 py-2 text-slate-500">{x.sortOrder}</td>
            <td className="px-4 py-2 font-medium">{x.name}</td>
            <td className="whitespace-nowrap px-4 py-2 text-right">
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(x); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(x)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>
      {draft && (
        <Modal title={draft.id ? '島を編集' : '島を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="名前"><input className={inputCls} placeholder="例：A島、窓側" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
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
