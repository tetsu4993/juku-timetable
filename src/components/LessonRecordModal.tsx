'use client';

import { useEffect, useState } from 'react';
import { previousRecord, UNDERSTANDING } from '@/domain/lesson-record';
import { SUBJECTS, type LessonRecord, type MaterialUnit, type SchoolMaterial, type Student, type Subject } from '@/domain/types';
import { deleteLessonRecord, listLessonRecords, listMaterialsFor, listMaterialUnits, saveLessonRecord } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal } from '@/components/ui';

export type RecordContext = {
  student: Student;
  date: string;
  subject: Subject;
  periodId: string | null;
  teacherId: string | null;
  teacherName: string;
  placementId: string | null;
  /** 時間割からなら科目は配置の科目で固定、カルテからなら選べる */
  subjectEditable?: boolean;
  /** 既存の記録を直すとき */
  record?: LessonRecord | null;
};

const fmt = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 授業記録の入力。上に同じ科目の前回の記録（申し送り）を出す */
export function LessonRecordModal({ ctx, onClose, onSaved }: { ctx: RecordContext; onClose: () => void; onSaved: () => void }) {
  const existing = ctx.record ?? null;
  const [date, setDate] = useState(existing?.date ?? ctx.date);
  const [subject, setSubject] = useState<Subject>(existing?.subject ?? ctx.subject);
  const [materialId, setMaterialId] = useState<string | null>(existing?.materialId ?? null);
  const [unitNames, setUnitNames] = useState<string[]>(existing?.unitNames ?? []);
  const [understanding, setUnderstanding] = useState<LessonRecord['understanding']>(existing?.understanding ?? '○');
  const [homework, setHomework] = useState(existing?.homework ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [teacherName, setTeacherName] = useState(existing?.teacherName || ctx.teacherName);
  // 時間割から開いたときは担当は配置の先生。カルテから追加したときは手入力
  const fromTimetable = Boolean(existing?.placementId ?? ctx.placementId);
  const [materials, setMaterials] = useState<SchoolMaterial[]>([]);
  const [units, setUnits] = useState<MaterialUnit[]>([]);
  const [history, setHistory] = useState<LessonRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { listLessonRecords(ctx.student.id).then(setHistory).catch(() => setHistory([])); }, [ctx.student.id]);
  const prev = previousRecord(history.filter((h) => h.id !== existing?.id), subject, date);
  useEffect(() => {
    listMaterialsFor(ctx.student.schoolId, ctx.student.grade, subject).then((ms) => {
      setMaterials(ms);
      // 最初から選んでおく教材：今の選択 → 前回の記録の教材 → 最初の教材（教科書）
      setMaterialId((cur) => [cur, prev?.materialId, ms[0]?.id].find((id) => id && ms.some((m) => m.id === id)) ?? null);
    }).catch(() => setMaterials([]));
  }, [ctx.student.schoolId, ctx.student.grade, subject, prev?.materialId]);
  useEffect(() => {
    if (!materialId) { setUnits([]); return; }
    listMaterialUnits(materialId).then(setUnits).catch(() => setUnits([]));
  }, [materialId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveLessonRecord({
        id: existing?.id, studentId: ctx.student.id, date, subject, materialId, unitNames, understanding,
        homework: homework.trim(), note: note.trim(),
        periodId: existing?.periodId ?? ctx.periodId, teacherId: existing?.teacherId ?? ctx.teacherId,
        placementId: existing?.placementId ?? ctx.placementId, teacherName: teacherName.trim(),
      });
      onSaved();
    } catch (e) { setError(String(e)); } finally { setSaving(false); }
  }
  async function remove() {
    if (!existing || !confirm('この授業記録を削除しますか？')) return;
    await deleteLessonRecord(existing.id);
    onSaved();
  }

  return (
    <Modal title={`授業記録：${ctx.student.name}（${ctx.student.grade}）`} onClose={onClose} size="xl">
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="日付"><input type="date" className={inputCls} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
            <Field label="科目">
              <select className={inputCls} value={subject} disabled={!ctx.subjectEditable} onChange={(e) => { setSubject(e.target.value as Subject); setUnitNames([]); }}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="担当"><input className={`${inputCls} ${fromTimetable ? 'bg-slate-50' : ''}`} value={teacherName} readOnly={fromTimetable} placeholder="例：山田先生" onChange={(e) => setTeacherName(e.target.value)} /></Field>
          </div>

          <Field label="教材">
            <select className={inputCls} value={materialId ?? ''} onChange={(e) => { setMaterialId(e.target.value || null); setUnitNames([]); }}>
              <option value="">{materials.length ? '選択しない' : '（この学校・学年・科目の教材が未登録）'}</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name}{m.publisher ? `（${m.publisher}）` : ''}</option>)}
            </select>
          </Field>

          {units.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">やった範囲</p>
              <div className="flex flex-wrap gap-2">
                {units.map((u) => {
                  const on = unitNames.includes(u.name);
                  return (
                    <button key={u.id} onClick={() => setUnitNames(on ? unitNames.filter((n) => n !== u.name) : [...unitNames, u.name])}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">理解度</p>
            <div className="flex gap-2">
              {UNDERSTANDING.map((u) => (
                <button key={u.key} onClick={() => setUnderstanding(u.key)}
                  className={`rounded-lg border px-4 py-2 text-sm ${understanding === u.key ? `border-transparent ${u.color} ring-2 ring-indigo-400` : 'border-slate-200 bg-white text-slate-600'}`}>
                  <span className="mr-1 text-base font-bold">{u.key}</span>{u.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="宿題"><textarea className={`${inputCls} h-16`} placeholder="例：ワーク p.12〜15" value={homework} onChange={(e) => setHomework(e.target.value)} /></Field>
          <Field label="気になったこと・申し送り"><textarea className={`${inputCls} h-28`} placeholder="例：符号のミスが多い。次回は計算の確認から。" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <ErrorText error={error} />
        </div>

        <aside className="rounded-xl bg-amber-50/60 p-4">
          <p className="mb-2 text-sm font-bold text-amber-900">前回の{subject}（申し送り）</p>
          {!prev ? <p className="text-sm text-slate-500">この科目の記録はまだありません。</p> : (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                {fmt(prev.date)}　{prev.teacherName || '担当不明'}
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${UNDERSTANDING.find((u) => u.key === prev.understanding)?.color}`}>{prev.understanding}</span>
              </p>
              {prev.unitNames.length > 0 && <p><span className="text-slate-500">範囲：</span>{prev.unitNames.join('、')}</p>}
              {prev.homework && <p><span className="text-slate-500">宿題：</span>{prev.homework}</p>}
              {prev.note && <p className="whitespace-pre-wrap rounded-lg bg-white p-2">{prev.note}</p>}
            </div>
          )}
        </aside>
      </div>
      <div className="mt-6 flex justify-between gap-2 border-t pt-4">
        <div>{existing && <Button variant="danger" onClick={remove}>削除</Button>}</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button disabled={saving} onClick={save}>{saving ? '保存中…' : '保存'}</Button>
        </div>
      </div>
    </Modal>
  );
}
