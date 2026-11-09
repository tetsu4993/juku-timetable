'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { filterStudents, fiscalYear, promotionDue } from '@/domain/school-year';
import { GRADES, SUBJECTS, type Grade, type Student, type Subject, type Weekday } from '@/domain/types';
import { deleteStudent, lastPromotedYear, listSchools, listStudents, promoteGrades, upsertStudent } from '@/lib/repo';
import { Button, CheckGroup, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad, WEEKDAY_LABELS } from '@/components/ui';

type Draft = Omit<Student, 'id'> & { id?: string };
const EMPTY: Draft = { name: '', grade: '中1', schoolId: null, regular: [] };
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // JST

const describe = (s: Student) =>
  WEEKDAYS.map((w) => {
    const subs = s.regular.filter((r) => r.weekday === w).map((r) => r.subject);
    return subs.length ? `${WEEKDAY_LABELS[w]}:${subs.join('・')}` : null;
  }).filter(Boolean).join(' / ');

export default function StudentsPage() {
  const { data, error, reload } = useLoad(async () => {
    const [students, schools, promoted] = await Promise.all([listStudents(), listSchools(), lastPromotedYear()]);
    return { students, schools, promoted };
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [graduated, setGraduated] = useState(false);

  const schoolName = (id?: string | null) => data?.schools.find((s) => s.id === id)?.name ?? '';
  const filtered = useMemo(() => data && filterStudents(data.students, { grade, schoolId, graduated })
    .filter((s) => !q || s.name.includes(q)), [data, grade, schoolId, graduated, q]);
  const year = fiscalYear(today());
  const due = data ? promotionDue(today(), data.promoted) : false;

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
    if (!confirm(`${s.name} を削除しますか？申込や時間割・成績からも消えます。`)) return;
    await deleteStudent(s.id);
    reload();
  }
  async function promote() {
    if (!confirm(`全員の学年を1つ上げて ${year}年度 の学年にします（高3は「卒業」になります）。よろしいですか？`)) return;
    const done = await promoteGrades(year);
    if (!done) alert('この年度の学年更新はすでに行われています。');
    reload();
  }

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft(EMPTY); }}>＋ 生徒を追加</Button>}>
        生徒 <span className="text-sm font-normal text-slate-500">{filtered ? `${filtered.length}人` : ''}</span>
      </PageTitle>

      {due && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-indigo-200 bg-indigo-50 p-4">
          <div className="text-sm text-indigo-900">
            <b>{year}年度になりました。</b>全員の学年を1つ上げますか？（中3→高1、高3→卒業。1年度に1回だけ実行できます）
          </div>
          <Button onClick={promote}>{year}年度の学年に更新</Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm shadow-sm">
          {[['在籍', false], ['卒業', true]].map(([label, g]) => (
            <button key={String(label)} onClick={() => setGraduated(g as boolean)}
              className={`rounded-md px-3 py-1 ${graduated === g ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <input className={`${inputCls} max-w-48`} placeholder="氏名で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />
        {!graduated && (
          <select className={`${inputCls} w-28`} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">全学年</option>
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
        <select className={`${inputCls} w-40`} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
          <option value="">全学校</option>
          {data?.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <ErrorText error={error} />
      <Table head={['氏名', '学年', '学校', '通常期の受講（曜日:科目）', '']}>
        {filtered?.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-2 font-medium">{s.name}</td>
            <td className="px-4 py-2">{s.grade}</td>
            <td className="px-4 py-2 text-slate-600">{schoolName(s.schoolId) || <span className="text-slate-300">—</span>}</td>
            <td className="px-4 py-2 text-slate-600">{describe(s)}</td>
            <td className="whitespace-nowrap px-4 py-2 text-right">
              <Link href={`/students/${s.id}/grades`} className="mr-2 text-sm text-indigo-600 hover:underline">成績</Link>
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(s); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(s)}>削除</Button>
            </td>
          </tr>
        ))}
        {filtered?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">該当する生徒がいません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? '生徒を編集' : '生徒を追加'} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <Field label="氏名"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="学年">
                <select className={inputCls} value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value as Grade })}>
                  {[...GRADES, '卒業'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="学校">
                <select className={inputCls} value={draft.schoolId ?? ''} onChange={(e) => setDraft({ ...draft, schoolId: e.target.value || null })}>
                  <option value="">未設定</option>
                  {data?.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">通常期の受講（曜日ごとの科目）</p>
              <div className="space-y-2 rounded-lg border p-2">
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
