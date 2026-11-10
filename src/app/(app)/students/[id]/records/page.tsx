'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { sortRecords, UNDERSTANDING } from '@/domain/lesson-record';
import { SUBJECTS, type LessonRecord, type Subject } from '@/domain/types';
import { listLessonRecords, listSchools, listStudents } from '@/lib/repo';
import { Button, ErrorText, inputCls, PageTitle, useLoad } from '@/components/ui';
import { LessonRecordModal, type RecordContext } from '@/components/LessonRecordModal';

const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // JST
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const fmt = (d: string) => `${Number(d.slice(0, 4))}/${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}（${WEEK[new Date(`${d}T00:00:00Z`).getUTCDay()]}）`;

export default function StudentRecordsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLoad(async () => {
    const [students, records, schools] = await Promise.all([listStudents(), listLessonRecords(id), listSchools()]);
    const student = students.find((s) => s.id === id) ?? null;
    return { student, records: sortRecords(records), school: schools.find((x) => x.id === student?.schoolId)?.name ?? null };
  }, [id]);
  const [subject, setSubject] = useState('');
  const [ctx, setCtx] = useState<RecordContext | null>(null);

  const shown = useMemo(() => (data?.records ?? []).filter((r) => !subject || r.subject === subject), [data, subject]);
  // 科目ごとの直近の理解度（最新3件）
  const summary = useMemo(() => {
    const by = new Map<Subject, LessonRecord[]>();
    for (const r of data?.records ?? []) by.set(r.subject, [...(by.get(r.subject) ?? []), r]);
    return SUBJECTS.filter((s) => by.has(s)).map((s) => ({ subject: s, recent: by.get(s)!.slice(0, 3), count: by.get(s)!.length }));
  }, [data]);

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.student) return <p>生徒が見つかりません。<Link href="/students" className="text-indigo-600">一覧へ</Link></p>;
  const student = data.student;
  const color = (k: string) => UNDERSTANDING.find((u) => u.key === k)?.color ?? '';

  return (
    <>
      <PageTitle action={
        <Button onClick={() => setCtx({
          student, date: today(), subject: (subject || student.regular[0]?.subject || '数学') as Subject,
          periodId: null, teacherId: null, teacherName: '', placementId: null, subjectEditable: true,
        })}>＋ 記録を追加</Button>
      }>
        {student.name} さんのカルテ <span className="text-base font-normal text-slate-500">{student.grade}{data.school ? `・${data.school}` : ''}</span>
      </PageTitle>
      <p className="mb-4 text-sm">
        <Link href="/students" className="text-indigo-600 hover:underline">← 生徒一覧</Link>
        <Link href={`/students/${student.id}/grades`} className="ml-4 text-indigo-600 hover:underline">成績（面談資料）</Link>
        <span className="ml-4 text-slate-500">時間割で配置済みの生徒をクリックしても記録できます。</span>
      </p>
      <ErrorText error={error} />

      {summary.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((s) => (
            <button key={s.subject} onClick={() => setSubject(subject === s.subject ? '' : s.subject)}
              className={`card p-3 text-left transition hover:shadow ${subject === s.subject ? 'ring-2 ring-indigo-400' : ''}`}>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold">{s.subject}</span>
                <span className="text-xs text-slate-500">{s.count}件</span>
              </div>
              <div className="flex gap-1">
                {s.recent.map((r) => <span key={r.id} title={r.date} className={`rounded px-2 py-0.5 text-sm font-bold ${color(r.understanding)}`}>{r.understanding}</span>)}
                <span className="ml-1 self-center text-xs text-slate-400">← 新しい順</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 text-sm">
        <select className={`${inputCls} max-w-40`} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">すべての科目</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="text-slate-500">{shown.length}件</span>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">まだ記録がありません。授業の後に、時間割のチップをクリックして記録してください。</div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-indigo-100 pl-6">
          {shown.map((r) => (
            <li key={r.id} className="card relative p-4">
              <span className="absolute -left-[33px] top-5 size-3 rounded-full bg-indigo-400 ring-4 ring-white" />
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-bold">{fmt(r.date)}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-sm">{r.subject}</span>
                <span className={`rounded px-2 py-0.5 text-sm font-bold ${color(r.understanding)}`}>
                  {r.understanding} {UNDERSTANDING.find((u) => u.key === r.understanding)?.label}
                </span>
                <span className="text-sm text-slate-500">{r.teacherName || '担当不明'}</span>
                <Button variant="ghost" className="ml-auto" onClick={() => setCtx({
                  student, date: r.date, subject: r.subject, periodId: r.periodId, teacherId: r.teacherId,
                  teacherName: r.teacherName, placementId: r.placementId, subjectEditable: !r.placementId, record: r,
                })}>編集</Button>
              </div>
              <dl className="grid gap-x-4 gap-y-1 text-sm md:grid-cols-[6rem_1fr]">
                {r.unitNames.length > 0 && <><dt className="text-slate-500">範囲</dt><dd>{r.unitNames.join('、')}</dd></>}
                {r.homework && <><dt className="text-slate-500">宿題</dt><dd className="whitespace-pre-wrap">{r.homework}</dd></>}
                {r.note && <><dt className="text-slate-500">申し送り</dt><dd className="whitespace-pre-wrap">{r.note}</dd></>}
              </dl>
            </li>
          ))}
        </ol>
      )}

      {ctx && <LessonRecordModal ctx={ctx} onClose={() => setCtx(null)} onSaved={() => { setCtx(null); reload(); }} />}
    </>
  );
}
