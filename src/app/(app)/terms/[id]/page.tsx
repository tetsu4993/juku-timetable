'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { SUBJECTS, weekdayOf, type Availability, type Subject } from '@/domain/types';
import {
  listAvailability, listEnrollments, listStudents, listTeachers, listTerms, setAvailability, setEnrollments,
} from '@/lib/repo';
import { ErrorText, inputCls, PageTitle, useLoad, WEEKDAY_LABELS } from '@/components/ui';

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export default function TermDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, reload } = useLoad(async () => {
    const [terms, students, teachers, enrollments, availability] = await Promise.all([
      listTerms(), listStudents(), listTeachers(), listEnrollments(id), listAvailability(id),
    ]);
    return { term: terms.find((t) => t.id === id) ?? null, students, teachers, enrollments, availability };
  }, [id]);
  const [tab, setTab] = useState<'enroll' | 'avail'>('enroll');
  const [saveError, setSaveError] = useState<string | null>(null);

  if (error) return <ErrorText error={error} />;
  if (!data) return <p className="text-slate-500">読み込み中…</p>;
  if (!data.term) return <p>期間が見つかりません。<Link href="/terms" className="text-blue-600">一覧へ戻る</Link></p>;

  const term = data.term;
  const isKosyu = term.kind === 'kosyu';
  const activeTab = isKosyu ? tab : 'avail';

  async function saveRow(studentId: string, subject: Subject, count: number) {
    const current = data!.enrollments.filter((e) => e.studentId === studentId && e.subject !== subject)
      .map((e) => ({ subject: e.subject, count: e.count }));
    try {
      setSaveError(null);
      await setEnrollments(term.id, studentId, [...current, { subject, count }]);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }

  return (
    <>
      <PageTitle>{term.name} <span className="text-sm font-normal text-slate-500">{term.startDate}〜{term.endDate}</span></PageTitle>
      <Link href="/terms" className="mb-3 inline-block text-sm text-blue-600 hover:underline">← 期間一覧へ</Link>
      {isKosyu && (
        <div className="mb-4 flex gap-2 border-b">
          {(['enroll', 'avail'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm ${activeTab === t ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500'}`}>
              {t === 'enroll' ? '申込コマ数' : '日付ごとの来塾可否'}
            </button>
          ))}
        </div>
      )}
      <ErrorText error={saveError} />

      {activeTab === 'enroll'
        ? <EnrollTable data={data} onSave={saveRow} />
        : <AvailEditor termId={term.id} dates={datesBetween(term.startDate, term.endDate)} data={data} onChanged={reload} onError={setSaveError} />}
    </>
  );
}

type Loaded = {
  students: Awaited<ReturnType<typeof listStudents>>;
  teachers: Awaited<ReturnType<typeof listTeachers>>;
  enrollments: Awaited<ReturnType<typeof listEnrollments>>;
  availability: Availability[];
};

function EnrollTable({ data, onSave }: { data: Loaded; onSave: (s: string, subj: Subject, n: number) => void }) {
  const [q, setQ] = useState('');
  const students = data.students.filter((s) => s.name.includes(q) || s.grade.includes(q));
  const count = (sid: string, subj: Subject) => data.enrollments.find((e) => e.studentId === sid && e.subject === subj)?.count ?? 0;
  return (
    <>
      <p className="mb-2 text-sm text-slate-500">数字を変えて枠の外をクリックすると保存されます。0にすると申込なしになり、その生徒は講習期間の時間割に出ません。</p>
      <input className={`${inputCls} mb-3 max-w-xs`} placeholder="氏名・学年で絞り込み" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded border bg-white">
        <table className="text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">氏名</th><th className="px-2 py-2">学年</th>
              {SUBJECTS.map((s) => <th key={s} className="px-2 py-2 font-medium">{s}</th>)}
              <th className="px-2 py-2">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((st) => (
              <tr key={st.id}>
                <td className="px-3 py-1 font-medium whitespace-nowrap">{st.name}</td>
                <td className="px-2 py-1 text-center">{st.grade}</td>
                {SUBJECTS.map((subj) => (
                  <td key={subj} className="px-1 py-1">
                    <input
                      type="number" min={0} defaultValue={count(st.id, subj) || ''}
                      key={`${st.id}-${subj}-${count(st.id, subj)}`}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right"
                      onBlur={(e) => {
                        const n = Math.max(0, Number(e.target.value) || 0);
                        if (n !== count(st.id, subj)) onSave(st.id, subj, n);
                      }}
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-right font-medium">
                  {data.enrollments.filter((e) => e.studentId === st.id).reduce((a, e) => a + e.count, 0) || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AvailEditor({ termId, dates, data, onChanged, onError }: {
  termId: string; dates: string[]; data: Loaded; onChanged: () => void; onError: (e: string | null) => void;
}) {
  const people = useMemo(() => [
    ...data.teachers.map((t) => ({ key: `teacher:${t.id}`, label: `先生：${t.name}`, type: 'teacher' as const, id: t.id })),
    ...data.students.map((s) => ({ key: `student:${s.id}`, label: `生徒：${s.name}（${s.grade}）`, type: 'student' as const, id: s.id })),
  ], [data]);
  const [sel, setSel] = useState(people[0]?.key ?? '');
  const person = people.find((p) => p.key === sel);

  const value = (date: string) => {
    const a = data.availability.find((x) => x.personType === person?.type && x.personId === person?.id && x.date === date);
    return a === undefined ? '' : a.available ? 'yes' : 'no';
  };

  async function change(date: string, v: string) {
    if (!person) return;
    try {
      onError(null);
      await setAvailability({ termId, personType: person.type, personId: person.id, date, available: v === '' ? null : v === 'yes' } as Availability);
      onChanged();
    } catch (e) { onError(String(e)); }
  }

  return (
    <>
      <p className="mb-2 text-sm text-slate-500">「いつも通り」は、先生は来塾曜日、生徒は講習なら申込の有無（通常期なら受講曜日）で判断します。</p>
      <select className={`${inputCls} mb-3 max-w-sm`} value={sel} onChange={(e) => setSel(e.target.value)}>
        {people.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {dates.map((d) => {
          const v = value(d);
          const wd = weekdayOf(d);
          return (
            <label key={d} className={`rounded border p-2 text-sm ${v === 'no' ? 'bg-red-50' : v === 'yes' ? 'bg-green-50' : 'bg-white'}`}>
              <span className={`block font-medium ${wd === 0 ? 'text-red-600' : wd === 6 ? 'text-blue-600' : ''}`}>
                {d.slice(5).replace('-', '/')}（{WEEKDAY_LABELS[wd]}）
              </span>
              <select className="mt-1 w-full rounded border border-slate-200 text-xs" value={v} onChange={(e) => change(d, e.target.value)}>
                <option value="">いつも通り</option>
                <option value="yes">来られる</option>
                <option value="no">来られない</option>
              </select>
            </label>
          );
        })}
      </div>
    </>
  );
}
