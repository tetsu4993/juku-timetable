'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Term } from '@/domain/types';
import { deleteTerm, listTerms, upsertTerm } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Draft = Omit<Term, 'id'> & { id?: string };
const KIND_LABEL = { regular: '通常期', kosyu: '講習' } as const;

export default function TermsPage() {
  const { data, error, reload } = useLoad(listTerms);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('名前を入力してください');
    if (!draft.startDate || !draft.endDate || draft.startDate > draft.endDate) return setSaveError('期間を正しく入力してください');
    try {
      await upsertTerm(draft);
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }

  async function remove(t: Term) {
    if (!confirm(`${t.name} を削除しますか？申込コマ数・来塾可否も消えます。`)) return;
    await deleteTerm(t.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft({ name: '', kind: 'kosyu', startDate: '', endDate: '' }); }}>＋ 期間を追加</Button>}>期間・講習</PageTitle>
      <p className="mb-3 text-sm text-slate-500">講習と通常期の期間が重なる日は、講習が優先されます。講習では、生徒ごとの申込コマ数と日付ごとの来塾可否を設定できます。</p>
      <ErrorText error={error} />
      <Table head={['名前', '種別', '期間', '']}>
        {data?.map((t) => (
          <tr key={t.id}>
            <td className="px-3 py-2 font-medium">{t.name}</td>
            <td className="px-3 py-2">{KIND_LABEL[t.kind]}</td>
            <td className="px-3 py-2">{t.startDate}〜{t.endDate}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <Link href={`/terms/${t.id}`} className="mr-2 text-sm text-blue-600 hover:underline">
                {t.kind === 'kosyu' ? '申込・来塾可否' : '来塾可否'}
              </Link>
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(t); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(t)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? '期間を編集' : '期間を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="名前"><input className={inputCls} placeholder="例：2026年 夏期講習" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="種別">
              <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Term['kind'] })}>
                <option value="kosyu">講習（申込コマ数で管理）</option>
                <option value="regular">通常期（曜日固定）</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始日"><input type="date" className={inputCls} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></Field>
              <Field label="終了日"><input type="date" className={inputCls} value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></Field>
            </div>
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
