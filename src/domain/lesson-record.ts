import type { LessonRecord, Subject } from './types';

/** 理解度（4段階） */
export const UNDERSTANDING = [
  { key: '◎', label: 'よくできた', color: 'bg-emerald-100 text-emerald-800' },
  { key: '○', label: 'できた', color: 'bg-sky-100 text-sky-800' },
  { key: '△', label: 'もう少し', color: 'bg-amber-100 text-amber-800' },
  { key: '×', label: '要復習', color: 'bg-red-100 text-red-800' },
] as const;

/** 新しい日付が先。同じ日なら後から書いたものが先 */
export const sortRecords = (records: LessonRecord[]) =>
  [...records].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

/** その日より前の、同じ科目のいちばん新しい記録（申し送りに使う） */
export function previousRecord(records: LessonRecord[], subject: Subject, date: string): LessonRecord | null {
  return sortRecords(records.filter((r) => r.subject === subject && r.date < date))[0] ?? null;
}
