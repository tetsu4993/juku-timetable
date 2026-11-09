'use client';

import { useState } from 'react';
import type { Student, Subject, Teacher } from '@/domain/types';
import { Button, inputCls } from '@/components/ui';
import { Cell } from './Cell';
import { StudentChip } from './StudentChip';

export type PoolItem = { student: Student; subjects: Subject[]; remaining?: Partial<Record<Subject, number>> };

export function SidePanel({ dateLabel, teachers, pool, others, onAddExtras }: {
  dateLabel: string; teachers: Teacher[]; pool: PoolItem[]; others: Student[];
  onAddExtras: (ids: string[]) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const shown = others.filter((s) => s.name.includes(q) || s.grade.includes(q));

  return (
    <aside className="w-[30%] min-w-72 space-y-4">
      <section className="card p-3">
        <h2 className="mb-2 font-bold">{dateLabel} の来塾者</h2>
        <p className="mb-1 text-xs font-medium text-slate-500">先生（{teachers.length}人）</p>
        <div className="mb-3 flex flex-wrap gap-1">
          {teachers.map((t) => <span key={t.id} className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs">{t.name}</span>)}
          {teachers.length === 0 && <span className="text-xs text-slate-400">なし</span>}
        </div>
        <p className="mb-1 text-xs font-medium text-slate-500">未配置の生徒（{pool.length}人）ドラッグして時間割へ</p>
        <Cell dropId="pool" className="flex flex-wrap content-start gap-1 rounded bg-slate-50 p-2">
          {pool.map(({ student, subjects, remaining }) => (
            <StudentChip
              key={student.id}
              dragId={`student:${student.id}`}
              label={student.name}
              sub={student.grade}
              note={remaining ? subjects.map((s) => `${s}残${remaining[s]}`).join(' ') : subjects.join('・')}
            />
          ))}
          {pool.length === 0 && <span className="text-xs text-slate-400">全員配置済みです</span>}
        </Cell>
      </section>

      <section className="card p-3">
        <h2 className="mb-1 font-bold">緊急の曜日変更</h2>
        <p className="mb-2 text-xs text-slate-500">この日に来ることになった生徒を選び、未配置の一覧に加えます。</p>
        <input className={`${inputCls} mb-2`} placeholder="氏名・学年で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-56 space-y-1 overflow-auto">
          {shown.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={checked.includes(s.id)}
                onChange={(e) => setChecked(e.target.checked ? [...checked, s.id] : checked.filter((x) => x !== s.id))} />
              {s.name} <span className="text-xs text-slate-500">{s.grade}</span>
            </label>
          ))}
        </div>
        <Button className="mt-2 w-full" disabled={checked.length === 0}
          onClick={() => { onAddExtras(checked); setChecked([]); }}>
          選んだ生徒を配置（{checked.length}人）
        </Button>
      </section>
    </aside>
  );
}
