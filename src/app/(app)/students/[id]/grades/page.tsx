'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { coreTotal, diffFromPrevious, sortExams, totalOf } from '@/domain/grades';
import { SUBJECTS, type Subject } from '@/domain/types';
import { listExams, listScoresForStudent, listStudents } from '@/lib/repo';
import { Button, ErrorText, inputCls, useLoad } from '@/components/ui';
import { shortExamName } from '@/components/exams';

function Diff({ v }: { v: number | undefined | null }) {
  if (v === undefined || v === null || v === 0) return null;
  return <span className={`ml-0.5 text-[10px] ${v > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{v > 0 ? `↑${v}` : `↓${-v}`}</span>;
}

export default function StudentGradesPage() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject>('数学');
  const { data, error } = useLoad(async () => {
    const [students, exams, scores] = await Promise.all([listStudents(), listExams(), listScoresForStudent(id)]);
    return { student: students.find((s) => s.id === id) ?? null, exams: sortExams(exams), scores };
  }, [id]);

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.student) return <p>生徒が見つかりません。<Link href="/students" className="text-blue-600">一覧へ</Link></p>;

  const { student, scores } = data;
  // 点数が1つでもあるテストだけを並べる
  const exams = data.exams.filter((e) => totalOf(scores.filter((s) => s.examId === e.id)) !== null);
  const val = (examId: string, sub: Subject) => scores.find((s) => s.examId === examId && s.subject === sub)?.score ?? null;
  const usedSubjects = SUBJECTS.filter((sub) => scores.some((s) => s.subject === sub && s.score !== null));
  const chart = exams.map((e) => ({
    name: shortExamName(e),
    '5教科合計': coreTotal(scores.filter((s) => s.examId === e.id)),
    [subject]: val(e.id, subject),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <style>{'@page { size: A4 portrait; margin: 12mm; }'}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/students" className="text-sm text-blue-600 hover:underline">← 生徒一覧</Link>
        <Button variant="ghost" onClick={() => window.print()}>印刷（面談資料）</Button>
      </div>
      <h1 className="text-xl font-bold">{student.name} さん　定期テスト成績</h1>
      <p className="mb-4 text-sm text-slate-500">{student.grade}　／　↑↓ は前回のテストからの増減（合計の増減は、両方のテストにある科目だけで比べています）</p>
      <ErrorText error={error} />

      {exams.length === 0 ? (
        <p className="rounded border bg-white p-6 text-center text-slate-500">まだ点数が入力されていません。</p>
      ) : (
        <>
          <div className="mb-6 overflow-x-auto rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-2 text-left">テスト</th>
                  {usedSubjects.map((s) => <th key={s} className="px-1 py-2 text-center text-xs">{s}</th>)}
                  <th className="px-2 py-2 text-right">5教科</th>
                  <th className="px-2 py-2 text-right">合計</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exams.map((e) => {
                  const d = diffFromPrevious(data.exams, scores, id, e.id);
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-2 py-1.5">{e.name}</td>
                      {usedSubjects.map((sub) => (
                        <td key={sub} className="whitespace-nowrap px-1 py-1.5 text-center">
                          {val(e.id, sub) ?? <span className="text-slate-300">—</span>}<Diff v={d.bySubject[sub]} />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium">
                        {coreTotal(scores.filter((s) => s.examId === e.id)) ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right">
                        {totalOf(scores.filter((s) => s.examId === e.id))}<Diff v={d.total} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
            <section className="rounded border bg-white p-3 break-inside-avoid">
              <h2 className="mb-2 text-sm font-bold">5教科合計の推移</h2>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="5教科合計" stroke="#2563eb" strokeWidth={2} connectNulls isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="rounded border bg-white p-3 break-inside-avoid">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold">{subject}の推移</h2>
                <select className={`${inputCls} w-32 print:hidden`} value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
                  {(usedSubjects.length ? usedSubjects : SUBJECTS).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey={subject} stroke="#059669" strokeWidth={2} connectNulls isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
