'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { GRADES, SUBJECTS, type Grade, type Student, type Subject, type Weekday } from '@/domain/types';
import { deleteStudent, listStudents, upsertStudent } from '@/lib/repo';
import { Button, CheckGroup, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad, WEEKDAY_LABELS } from '@/components/ui';

type Draft = Omit<Student, 'id'> & { id?: string };
const EMPTY: Draft = { name: '', grade: '中1', regular: [] };
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

const describe = (s: Student) =>
  WEEKDAYS.map((w) => {
    const subs = s.regular.filter((r) => r.weekday === w).map((r) => r.subject);
    return subs.length ? `${WEEKDAY_LABELS[w]}:${subs.join('・')}` : null;
  }).filter(Boolean).join(' / ');

export default function StudentsPage() {
  const { data, error, reload } = useLoad(listStudents);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => data?.filter((s) => s.name.includes(q) || s.grade.includes(q)), [data, q]);

  function setDay(w: Weekday, subjects: Subject[]) {
    if (!draft) return;
    setDraft({ ...draft, regular: [...draft.regular.filter((r) => r.weekday !== w), ...subjects.map((subject) => ({ weekday: w, subject }))] });
  }

  async function save() {
    if (!draft || !draft.name.trim()) return setSaveError('氏名を入力してください');
    try {
      await upsertStudent(draft);
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }

  async function remove(s: Student) {
    if (!confirm(`${s.name} を削除しますか？申込や時間割からも消えます。`)) return;
    await deleteStudent(s.id);
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft(EMPTY); }}>＋ 生徒を追加</Button>}>
        生徒 <span className="text-sm font-normal text-slate-500">{data ? `${data.length}人` : ''}</span>
      </PageTitle>
      <input className={`${inputCls} mb-3 max-w-xs`} placeholder="氏名・学年で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />
      <ErrorText error={error} />
      <Table head={['氏名', '学年', '通常期の受講（曜日:科目）', '']}>
        {filtered?.map((s) => (
          <tr key={s.id}>
            <td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.grade}</td>
            <td className="px-3 py-2">{describe(s)}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <Link href={`/students/${s.id}/grades`} className="mr-2 text-sm text-indigo-600 hover:underline">成績</Link>
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(s); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(s)}>削除</Button>
            </td>
          </tr>
        ))}
        {filtered?.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">該当する生徒がいません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? '生徒を編集' : '生徒を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="氏名"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="学年">
              <select className={inputCls} value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value as Grade })}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">通常期の受講（曜日ごとの科目）</p>
              <div className="space-y-2 rounded border p-2">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="flex gap-2">
                    <span className="w-5 shrink-0 text-sm font-medium">{WEEKDAY_LABELS[w]}</span>
                    <CheckGroup options={SUBJECTS} value={draft.regular.filter((r) => r.weekday === w).map((r) => r.subject)} onChange={(v) => setDay(w, v)} />
                  </div>
                ))}
              </div>
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
