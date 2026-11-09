'use client';

import { useState } from 'react';
import { GRADES, SUBJECTS, type Teacher, type Weekday } from '@/domain/types';
import { deleteTeacher, listTeachers, upsertTeacher } from '@/lib/repo';
import { Button, CheckGroup, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad, WEEKDAY_LABELS } from '@/components/ui';

type Draft = Omit<Teacher, 'id'> & { id?: string };
const EMPTY: Draft = { name: '', subjects: [], grades: [], weekdays: [] };
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function TeachersPage() {
  const { data, error, reload } = useLoad(listTeachers);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('氏名を入力してください');
    try {
      await upsertTeacher(draft);
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }

  async function remove(t: Teacher) {
    if (!confirm(`${t.name} を削除しますか？配置済みの時間割からも消えます。`)) return;
    await deleteTeacher(t.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft(EMPTY); }}>＋ 先生を追加</Button>}>先生</PageTitle>
      <ErrorText error={error} />
      <Table head={['氏名', '担当科目', '担当学年', '来塾曜日', '']}>
        {data?.map((t) => (
          <tr key={t.id}>
            <td className="px-3 py-2 font-medium">{t.name}</td>
            <td className="px-3 py-2">{t.subjects.join('・')}</td>
            <td className="px-3 py-2">{t.grades.join('・')}</td>
            <td className="px-3 py-2">{WEEKDAYS.filter((w) => t.weekdays.includes(w)).map((w) => WEEKDAY_LABELS[w]).join('・')}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(t); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(t)}>削除</Button>
            </td>
          </tr>
        ))}
        {data?.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">まだ登録がありません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? '先生を編集' : '先生を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="氏名"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="担当科目"><CheckGroup options={SUBJECTS} value={draft.subjects} onChange={(subjects) => setDraft({ ...draft, subjects })} /></Field>
            <Field label="担当学年"><CheckGroup options={GRADES} value={draft.grades} onChange={(grades) => setDraft({ ...draft, grades })} /></Field>
            <Field label="来塾曜日（通常期）"><CheckGroup options={WEEKDAYS} value={draft.weekdays} onChange={(weekdays) => setDraft({ ...draft, weekdays })} label={(w) => WEEKDAY_LABELS[w]} /></Field>
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
