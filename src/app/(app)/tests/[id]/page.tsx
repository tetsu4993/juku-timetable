'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { parseScore, subjectAverages, totalOf } from '@/domain/grades';
import { GRADES, SUBJECTS, type Subject } from '@/domain/types';
import { listExams, listScores, listStudents, setScore } from '@/lib/repo';
import { ErrorText, inputCls, PageTitle, useLoad } from '@/components/ui';

export default function ScoreEntryPage() {
  const { id } = useParams<{ id: string }>();
  const [grade, setGrade] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const { data, error, reload } = useLoad(async () => {
    const [exams, students, scores] = await Promise.all([listExams(), listStudents(), listScores(id)]);
    return { exam: exams.find((e) => e.id === id) ?? null, students, scores };
  }, [id]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const grades = useMemo(() => GRADES.filter((g) => data?.students.some((s) => s.grade === g)), [data]);
  const valueOf = (studentId: string, subject: Subject) =>
    data?.scores.find((s) => s.studentId === studentId && s.subject === subject)?.score ?? null;

  async function save(studentId: string, subject: Subject, input: HTMLInputElement) {
    const before = valueOf(studentId, subject);
    const v = parseScore(input.value);
    if (v === 'invalid') {
      input.value = before === null ? '' : String(before);
      return notify('点数は0〜100の整数で入力してください');
    }
    if (v === before) return;
    try { await setScore(id, studentId, subject, v); await reload(); } catch (e) { notify(`保存できませんでした：${String(e)}`); }
  }

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.exam) return <p>テストが見つかりません。<Link href="/tests" className="text-indigo-600">一覧へ</Link></p>;

  const shown = data.students.filter((s) => !grade || s.grade === grade);
  const avg = subjectAverages(data.scores, id);

  return (
    <>
      <PageTitle action={<Link href="/tests" className="text-sm text-indigo-600 hover:underline">← テスト一覧</Link>}>{data.exam.name} の点数入力</PageTitle>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">学年
          <select className={`${inputCls} w-28`} value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">すべて</option>
            {grades.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <span className="text-slate-500">欄を離れると保存します。空欄は合計・平均に含めません。</span>
      </div>
      <ErrorText error={error} />
      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-2 py-2 text-left">生徒</th>
              {SUBJECTS.map((s) => <th key={s} className="px-1 py-2 text-center text-xs">{s}</th>)}
              <th className="px-2 py-2 text-right">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((st) => (
              <tr key={st.id}>
                <td className="whitespace-nowrap px-2 py-1">
                  <Link href={`/students/${st.id}/grades`} className="hover:underline">{st.name}</Link>
                  <span className="ml-1 text-xs text-slate-500">{st.grade}</span>
                </td>
                {SUBJECTS.map((sub) => {
                  const v = valueOf(st.id, sub);
                  return (
                    <td key={sub} className="px-1 py-1 text-center">
                      <input key={`${st.id}-${sub}-${v}`} inputMode="numeric" defaultValue={v ?? ''} aria-label={`${st.name} ${sub}`}
                        className="w-12 rounded border border-slate-300 px-1 py-0.5 text-right"
                        onBlur={(e) => save(st.id, sub, e.currentTarget)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right font-medium">{totalOf(data.scores.filter((s) => s.studentId === st.id)) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 text-xs">
            <tr>
              <td className="px-2 py-2 font-medium">平均点</td>
              {SUBJECTS.map((s) => <td key={s} className="px-1 py-2 text-center">{avg[s] ?? '—'}</td>)}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-slate-800 px-4 py-2 text-sm text-white shadow">{toast}</div>}
    </>
  );
}
