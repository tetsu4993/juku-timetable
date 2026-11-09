'use client';

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import type { Subject, TemplateSlot, Weekday } from '@/domain/types';
import { canTeach, CAPACITY } from '@/domain/warnings';
import { duplicateIslands } from '@/domain/school-year';
import { IslandSelect } from '@/components/timetable/IslandSelect';
import {
  addTemplateSlot, AlreadyPlacedError, listIslands, listTemplateIslands, setTemplateIsland, listPeriods, listStudents, listTeachers, listTemplateSlots, moveTemplateSlot, removeTemplateSlot,
} from '@/lib/repo';
import { ErrorText, PageTitle, useLoad, WEEKDAY_LABELS } from '@/components/ui';
import { Cell } from '@/components/timetable/Cell';
import { StudentChip } from '@/components/timetable/StudentChip';
import { SubjectPicker } from '@/components/timetable/SubjectPicker';

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];

export default function TemplatesPage() {
  const [wd, setWd] = useState<Weekday>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ studentId: string; periodId: string; teacherId: string; subjects: Subject[] } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { data, error, reload } = useLoad(async () => {
    const [teachers, allStudents, periods, slots, islands, cellIslands] = await Promise.all([
      listTeachers(), listStudents(), listPeriods(), listTemplateSlots(wd), listIslands(), listTemplateIslands(wd),
    ]);
    // 卒業生は未配置の一覧に出さない（配置済みのチップは残す）
    return { teachers, students: allStudents, active: allStudents.filter((s) => s.grade !== '卒業'), periods, slots, islands, cellIslands };
  }, [wd]);

  const view = useMemo(() => {
    if (!data) return null;
    const cols = data.teachers.filter((t) => t.weekdays.includes(wd) || data.slots.some((s) => s.teacherId === t.id));
    const pool = data.active
      .map((s) => ({
        student: s,
        subjects: s.regular.filter((r) => r.weekday === wd).map((r) => r.subject)
          .filter((sub) => !data.slots.some((x) => x.studentId === s.id && x.subject === sub)),
      }))
      .filter((x) => x.subjects.length > 0);
    return { cols, pool };
  }, [data, wd]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };
  async function act(fn: () => Promise<unknown>) {
    try { await fn(); } catch (e) {
      notify(e instanceof AlreadyPlacedError ? 'この生徒は同じコマに配置済みです' : `保存できませんでした：${String(e)}`);
    }
    await reload();
  }
  const sameSlot = (slots: TemplateSlot[], periodId: string, studentId: string, exceptId?: string) =>
    slots.some((s) => s.periodId === periodId && s.studentId === studentId && s.id !== exceptId);

  function onDragEnd(e: DragEndEvent) {
    if (!data || !view || !e.over) return;
    const [kind, id] = String(e.active.id).split(':');
    const target = String(e.over.id);
    if (target === 'pool') {
      if (kind === 'slot') act(() => removeTemplateSlot(id));
      return;
    }
    const [, periodId, teacherId] = target.split(':');
    if (kind === 'slot') {
      const s = data.slots.find((x) => x.id === id);
      if (!s || (s.periodId === periodId && s.teacherId === teacherId)) return;
      if (sameSlot(data.slots, periodId, s.studentId, s.id)) return notify('この生徒は同じコマに配置済みです');
      act(() => moveTemplateSlot(id, periodId, teacherId));
      return;
    }
    const item = view.pool.find((x) => x.student.id === id);
    if (!item) return;
    if (sameSlot(data.slots, periodId, id)) return notify('この生徒は同じコマに配置済みです');
    if (item.subjects.length === 1) {
      act(() => addTemplateSlot({ weekday: wd, periodId, teacherId, studentId: id, subject: item.subjects[0] }));
    } else {
      setPicker({ studentId: id, periodId, teacherId, subjects: item.subjects });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <PageTitle>曜日テンプレート</PageTitle>
      <p className="mb-3 text-sm text-slate-500">
        通常期の「いつもの時間割」です。日付を開くと、その曜日のテンプレートが最初から並びます（その日の変更はその日だけ）。
      </p>
      <div className="mb-4 flex gap-1">
        {WEEKDAYS.map((w) => (
          <button key={w} onClick={() => setWd(w)}
            className={`rounded px-4 py-1.5 text-sm ${w === wd ? 'bg-indigo-600 text-white' : 'border bg-white text-slate-600'}`}>
            {WEEKDAY_LABELS[w]}曜
          </button>
        ))}
      </div>
      <ErrorText error={error} />
      {!data || !view ? <p className="text-slate-500">読み込み中…</p> : (
        <div className="flex gap-4">
          <aside className="w-80 shrink-0">
            <section className="card p-3">
              <h2 className="mb-1 font-bold">{WEEKDAY_LABELS[wd]}曜の未配置（{view.pool.length}人）</h2>
              <p className="mb-2 text-xs text-slate-500">生徒マスタで{WEEKDAY_LABELS[wd]}曜に通う生徒です。ドラッグして配置します。</p>
              <Cell dropId="pool" className="flex flex-wrap content-start gap-1 rounded bg-slate-50 p-2">
                {view.pool.map(({ student, subjects }) => (
                  <StudentChip key={student.id} dragId={`student:${student.id}`} label={student.name} sub={student.grade} note={subjects.join('・')} />
                ))}
                {view.pool.length === 0 && <span className="text-xs text-slate-400">全員配置済みです</span>}
              </Cell>
            </section>
          </aside>
          <div className="flex-1 overflow-x-auto">
            {data.periods.length === 0 || view.cols.length === 0 ? (
              <p className="card p-6 text-center text-slate-500">
                {data.periods.length === 0 ? 'コマが登録されていません。' : `${WEEKDAY_LABELS[wd]}曜に来る先生がいません。`}
              </p>
            ) : (
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr>
                    <th className="w-20 border bg-slate-100 p-2"></th>
                    {view.cols.map((t) => <th key={t.id} className="border bg-slate-100 p-2">{t.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((per) => (
                    <tr key={per.id}>
                      <th className="border bg-slate-50 p-2 text-left align-top">
                        {per.name}<div className="text-[10px] font-normal text-slate-500">{per.start}〜{per.end}</div>
                      </th>
                      {view.cols.map((t) => {
                        const inCell = data.slots.filter((s) => s.periodId === per.id && s.teacherId === t.id);
                        return (
                          <td key={t.id} className="border p-0 align-top">
                            <IslandSelect islands={data.islands}
                              value={data.cellIslands.find((c) => c.periodId === per.id && c.teacherId === t.id)?.islandId ?? null}
                              duplicate={duplicateIslands(data.cellIslands, per.id).has(t.id)}
                              onChange={(islandId) => act(() => setTemplateIsland(wd, per.id, t.id, islandId))} />
                            <Cell dropId={`cell:${per.id}:${t.id}`} over={inCell.length > CAPACITY} className="flex flex-col items-start gap-1 p-1">
                              {inCell.map((s) => {
                                const st = data.students.find((x) => x.id === s.studentId);
                                if (!st) return null;
                                const warn = !canTeach(t, st.grade, s.subject) ? `担当外：${t.name}は${st.grade}の${s.subject}の担当ではありません` : undefined;
                                return <StudentChip key={s.id} dragId={`slot:${s.id}`} label={st.name} sub={`${st.grade} ${s.subject}`} warn={warn} />;
                              })}
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
          onCancel={() => setPicker(null)}
          onPick={(subject) => {
            const { studentId, periodId, teacherId } = picker;
            setPicker(null);
            act(() => addTemplateSlot({ weekday: wd, periodId, teacherId, studentId, subject }));
          }}
        />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-slate-800 px-4 py-2 text-sm text-white shadow">{toast}</div>}
    </DndContext>
  );
}
