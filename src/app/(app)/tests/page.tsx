'use client';

import Link from 'next/link';
import { useState } from 'react';
import { sortExams } from '@/domain/grades';
import type { Exam } from '@/domain/types';
import { deleteExam, listExams, upsertExam } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';
import { autoExamName, EXAM_KIND_LABEL } from '@/components/exams';

type Draft = Omit<Exam, 'id'> & { id?: string };
const thisYear = () => { const d = new Date(); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; };

export default function ExamsPage() {
  const { data, error, reload } = useLoad(async () => sortExams(await listExams()).reverse());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    if (!Number.isInteger(draft.year) || draft.year < 2000) return setSaveError('年度を正しく入力してください');
    try {
      await upsertExam({ ...draft, name: draft.name.trim() || autoExamName(draft) });
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }
  async function remove(x: Exam) {
    if (!confirm(`${x.name} を削除しますか？入力した点数も消えます。`)) return;
    await deleteExam(x.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft({ name: '', year: thisYear(), semester: 1, kind: 'midterm' }); }}>＋ テストを追加</Button>}>
        定期テスト
      </PageTitle>
      <p className="mb-3 text-sm text-slate-500">テストを選ぶと、生徒×科目の表で点数をまとめて入力できます。生徒ごとの比較表・グラフは「生徒」画面の「成績」から開けます。</p>
      <ErrorText error={error} />
      <Table head={['テスト', '年度', '学期', '種別', '']}>
        {data?.map((x) => (
          <tr key={x.id}>
            <td className="px-3 py-2 font-medium"><Link href={`/tests/${x.id}`} className="text-blue-600 hover:underline">{x.name}</Link></td>
            <td className="px-3 py-2">{x.year}</td>
            <td className="px-3 py-2">{x.semester}学期</td>
            <td className="px-3 py-2">{EXAM_KIND_LABEL[x.kind]}</td>
            <td className="whitespace-nowrap px-3 py-2 text-right">
              <Link href={`/tests/${x.id}`} className="mr-2 text-sm text-blue-600 hover:underline">点数を入力</Link>
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(x); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(x)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? 'テストを編集' : 'テストを追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="年度"><input type="number" className={inputCls} value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} /></Field>
              <Field label="学期">
                <select className={inputCls} value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: Number(e.target.value) as Exam['semester'] })}>
                  <option value={1}>1学期</option><option value={2}>2学期</option><option value={3}>3学期</option>
                </select>
              </Field>
              <Field label="種別">
                <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Exam['kind'] })}>
                  <option value="midterm">中間</option><option value="final">期末</option>
                </select>
              </Field>
            </div>
            <Field label="名前（空欄なら自動）"><input className={inputCls} placeholder={autoExamName(draft)} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
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
