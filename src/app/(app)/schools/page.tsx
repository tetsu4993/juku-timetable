'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { School } from '@/domain/types';
import { deleteSchool, listSchools, upsertSchool } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Draft = Omit<School, 'id'> & { id?: string };

export default function SchoolsPage() {
  const { data, error, reload } = useLoad(listSchools);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('学校名を入力してください');
    try { await upsertSchool({ ...draft, name: draft.name.trim() }); setDraft(null); reload(); } catch (e) { setSaveError(String(e)); }
  }
  async function remove(s: School) {
    if (!confirm(`${s.name} を削除しますか？この学校の生徒は「学校未設定」になります。`)) return;
    await deleteSchool(s.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft({ name: '', kind: '中' }); }}>＋ 学校を追加</Button>}>学校</PageTitle>
      <p className="mb-3 text-sm text-slate-500">生徒の在籍校です。時間割や成績の画面で、生徒の横に表示したり、学校ごとに絞り込んだりできます。</p>
      <ErrorText error={error} />
      <Table head={['学校名', '種別', '']}>
        {data?.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-2 font-medium"><Link href={`/schools/${s.id}`} className="hover:underline">{s.name}</Link></td>
            <td className="px-4 py-2">{s.kind}学校</td>
            <td className="whitespace-nowrap px-4 py-2 text-right">
              <Link href={`/schools/${s.id}`} className="mr-2 text-sm text-indigo-600 hover:underline">学年・科目・教材</Link>
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(s); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(s)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>
      {draft && (
        <Modal title={draft.id ? '学校を編集' : '学校を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="学校名"><input className={inputCls} placeholder="例：みなみ中" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="種別">
              <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as School['kind'] })}>
                <option value="小">小学校</option><option value="中">中学校</option><option value="高">高校</option>
              </select>
            </Field>
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
