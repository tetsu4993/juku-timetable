'use client';

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { termForDate, studentsForDate, teachersForDate } from '@/domain/attendance';
import { subjectsLeftToday } from '@/domain/pool';
import { remainingBySubject } from '@/domain/remaining';
import { weekdayOf, type Placement, type Subject } from '@/domain/types';
import { canTeach, CAPACITY, isDoubleBooked, isOverCapacity } from '@/domain/warnings';
import {
  addExtras, addPlacement, AlreadyPlacedError, listAvailability, listEnrollments, listExtras, listPeriods,
  listPlacements, listPlacementsInRange, listStudents, listTeachers, listTerms, movePlacement, removePlacement,
} from '@/lib/repo';
import { Button, ErrorText, useLoad, WEEKDAY_LABELS } from '@/components/ui';
import { Cell } from '@/components/timetable/Cell';
import { SidePanel, type PoolItem } from '@/components/timetable/SidePanel';
import { StudentChip } from '@/components/timetable/StudentChip';
import { SubjectPicker } from '@/components/timetable/SubjectPicker';

const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // JST
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function TimetablePage() {
  const [date, setDate] = useState(today);
  const [toast, setToast] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ studentId: string; periodId: string; teacherId: string; subjects: Subject[] } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { data, error, reload } = useLoad(async () => {
    const [terms, teachers, students, periods, extras] = await Promise.all([
      listTerms(), listTeachers(), listStudents(), listPeriods(), listExtras(date),
    ]);
    const term = termForDate(terms, date);
    const [enrollments, availability, placements] = await Promise.all([
      term ? listEnrollments(term.id) : Promise.resolve([]),
      term ? listAvailability(term.id) : Promise.resolve([]),
      term?.kind === 'kosyu' ? listPlacementsInRange(term.startDate, term.endDate) : listPlacements(date),
    ]);
    return { term, teachers, students, periods, extras, enrollments, availability, placements };
  }, [date]);

  const view = useMemo(() => {
    if (!data) return null;
    const { term, teachers, students, enrollments, availability, extras, placements } = data;
    const dayTeachers = teachersForDate(teachers, date, term, availability);
    const dayStudents = studentsForDate(students, date, term, enrollments, availability, extras);
    const todays = placements.filter((p) => p.date === date);
    const pool: PoolItem[] = dayStudents
      .map((s) => ({
        student: s,
        subjects: subjectsLeftToday(s, date, term, enrollments, placements),
        remaining: term?.kind === 'kosyu' ? remainingBySubject(s.id, term, enrollments, placements) : undefined,
      }))
      .filter((x) => x.subjects.length > 0 || (term?.kind !== 'kosyu' && !todays.some((p) => p.studentId === x.student.id)));
    const dayIds = new Set(dayStudents.map((s) => s.id));
    const others = students.filter((s) => !dayIds.has(s.id));
    // 配置済みだが今日の来塾者でない先生の列も残す
    const colTeachers = [...dayTeachers, ...teachers.filter((t) => !dayTeachers.includes(t) && todays.some((p) => p.teacherId === t.id))];
    return { dayTeachers, colTeachers, pool, others, todays };
  }, [data, date]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      notify(e instanceof AlreadyPlacedError ? 'すでに配置されています' : `保存できませんでした：${String(e)}`);
    }
    await reload();
  }

  function onDragEnd(e: DragEndEvent) {
    if (!data || !view || !e.over) return;
    const [kind, id] = String(e.active.id).split(':');
    const target = String(e.over.id);

    if (target === 'pool') {
      if (kind === 'placement') act(() => removePlacement(id));
      return;
    }
    const [, periodId, teacherId] = target.split(':');

    if (kind === 'placement') {
      const p = data.placements.find((x) => x.id === id);
      if (!p || (p.periodId === periodId && p.teacherId === teacherId)) return;
      if (isDoubleBooked(data.placements, date, periodId, p.studentId, p.id)) return notify('この生徒は同じコマに配置済みです');
      act(() => movePlacement(id, periodId, teacherId));
      return;
    }

    const student = data.students.find((s) => s.id === id);
    if (!student) return;
    if (isDoubleBooked(data.placements, date, periodId, id)) return notify('この生徒は同じコマに配置済みです');
    const subjects = subjectsLeftToday(student, date, data.term, data.enrollments, data.placements);
    if (subjects.length === 0) return notify('配置できる科目が残っていません');
    if (subjects.length === 1) {
      act(() => addPlacement({ date, periodId, teacherId, studentId: id, subject: subjects[0] }));
    } else {
      setPicker({ studentId: id, periodId, teacherId, subjects });
    }
  }

  const wd = weekdayOf(date);
  const dateLabel = `${date.slice(5).replace('-', '/')}（${WEEKDAY_LABELS[wd]}）`;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setDate(shift(date, -1))}>← 前日</Button>
        <input type="date" className="w-44 rounded border border-slate-300 px-2 py-1.5 text-sm" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <Button variant="ghost" onClick={() => setDate(shift(date, 1))}>翌日 →</Button>
        <span className="ml-2 rounded bg-slate-200 px-2 py-1 text-sm">
          {data?.term ? `${data.term.name}（${data.term.kind === 'kosyu' ? '講習' : '通常期'}）` : '期間外'}
        </span>
        <span className="text-xs text-slate-500">赤いマス＝先生1人に{CAPACITY}人超え／⚠＝担当外の科目・学年</span>
      </div>
      <ErrorText error={error} />
      {!view || !data ? <p className="text-slate-500">読み込み中…</p> : (
        <div className="flex gap-4">
          <SidePanel dateLabel={dateLabel} teachers={view.dayTeachers} pool={view.pool} others={view.others}
            onAddExtras={(ids) => act(() => addExtras(date, ids))} />
          <div className="flex-1 overflow-x-auto">
            {data.periods.length === 0 || view.colTeachers.length === 0 ? (
              <p className="rounded border bg-white p-6 text-center text-slate-500">
                {data.periods.length === 0 ? 'コマが登録されていません。' : 'この日に来塾する先生がいません。'}
              </p>
            ) : (
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr>
                    <th className="w-20 border bg-slate-100 p-2"></th>
                    {view.colTeachers.map((t) => <th key={t.id} className="border bg-slate-100 p-2">{t.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((per) => (
                    <tr key={per.id}>
                      <th className="border bg-slate-50 p-2 text-left align-top">
                        {per.name}<div className="text-[10px] font-normal text-slate-500">{per.start}〜{per.end}</div>
                      </th>
                      {view.colTeachers.map((t) => {
                        const inCell = view.todays.filter((p) => p.periodId === per.id && p.teacherId === t.id);
                        return (
                          <td key={t.id} className="border p-0 align-top">
                            <Cell dropId={`cell:${per.id}:${t.id}`} over={isOverCapacity(view.todays, date, per.id, t.id)}
                              className="flex flex-col items-start gap-1 p-1">
                              {inCell.map((p) => <PlacedChip key={p.id} p={p} data={data} teacherId={t.id} />)}
                            </Cell>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {picker && data && (
        <SubjectPicker
          studentName={data.students.find((s) => s.id === picker.studentId)?.name ?? ''}
          subjects={picker.subjects}
          remaining={data.term?.kind === 'kosyu' ? remainingBySubject(picker.studentId, data.term, data.enrollments, data.placements) : undefined}
          onCancel={() => setPicker(null)}
          onPick={(subject) => {
            const { studentId, periodId, teacherId } = picker;
            setPicker(null);
            act(() => addPlacement({ date, periodId, teacherId, studentId, subject }));
          }}
        />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-slate-800 px-4 py-2 text-sm text-white shadow">{toast}</div>}
    </DndContext>
  );
}

function PlacedChip({ p, data, teacherId }: {
  p: Placement;
  data: { students: { id: string; name: string; grade: import('@/domain/types').Grade }[]; teachers: import('@/domain/types').Teacher[] };
  teacherId: string;
}) {
  const s = data.students.find((x) => x.id === p.studentId);
  const t = data.teachers.find((x) => x.id === teacherId);
  if (!s) return null;
  const warn = t && !canTeach(t, s.grade, p.subject) ? `担当外：${t.name}先生は${s.grade}の${p.subject}の担当ではありません` : undefined;
  return <StudentChip dragId={`placement:${p.id}`} label={s.name} sub={`${s.grade} ${p.subject}`} warn={warn} />;
}
