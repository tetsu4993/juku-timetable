import type { Exam, Score, Subject } from './types';

export const CORE_SUBJECTS: Subject[] = ['国語', '数学', '英語', '理科', '社会'];

const order = (e: Exam) => e.year * 100 + e.semester * 10 + (e.kind === 'midterm' ? 0 : 1);

/** 年度→学期→中間・期末の昇順 */
export const sortExams = (exams: Exam[]) => [...exams].sort((a, b) => order(a) - order(b));

/** 空欄を除いた合計。値が1つもなければ null */
export function totalOf(scores: Score[]): number | null {
  const vals = scores.map((s) => s.score).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

const bySubject = (scores: Score[]) =>
  Object.fromEntries(scores.filter((s) => s.score !== null).map((s) => [s.subject, s.score])) as Partial<Record<Subject, number>>;

/** 前回（その生徒の点数がある直前のテスト）からの増減 */
export function diffFromPrevious(exams: Exam[], scores: Score[], studentId: string, examId: string) {
  const mine = scores.filter((s) => s.studentId === studentId);
  const of = (id: string) => mine.filter((s) => s.examId === id);
  const sorted = sortExams(exams);
  const idx = sorted.findIndex((e) => e.id === examId);
  const prev = sorted.slice(0, Math.max(idx, 0)).reverse().find((e) => totalOf(of(e.id)) !== null);
  const result: { total: number | null; bySubject: Partial<Record<Subject, number>> } = { total: null, bySubject: {} };
  if (!prev) return result;
  const now = of(examId), before = of(prev.id);
  const a = bySubject(now), b = bySubject(before);
  for (const k of Object.keys(a) as Subject[]) {
    if (b[k] !== undefined) result.bySubject[k] = a[k]! - b[k]!;
  }
  // 合計の増減は両方にある科目だけで比べる（中間5教科⇔期末9教科で合計がぶれないように）
  const common = Object.values(result.bySubject);
  result.total = common.length ? common.reduce((x, y) => x + y, 0) : null;
  return result;
}

/** テストごとの科目別平均（空欄除外、小数第1位） */
export function subjectAverages(scores: Score[], examId: string): Partial<Record<Subject, number>> {
  const sums: Partial<Record<Subject, [number, number]>> = {};
  for (const s of scores) {
    if (s.examId !== examId || s.score === null) continue;
    const [t, n] = sums[s.subject] ?? [0, 0];
    sums[s.subject] = [t + s.score, n + 1];
  }
  return Object.fromEntries(
    Object.entries(sums).map(([k, [t, n]]) => [k, Math.round((t / n) * 10) / 10]),
  ) as Partial<Record<Subject, number>>;
}

/** 入力欄の文字列 → 点数。空なら null、0〜100の整数以外は 'invalid' */
export function parseScore(input: string): number | null | 'invalid' {
  const v = input.trim();
  if (v === '') return null;
  if (!/^\d{1,3}$/.test(v)) return 'invalid';
  const n = Number(v);
  return n <= 100 ? n : 'invalid';
}

/** 5教科（国数英理社）の合計。中間・期末をまたいで比べるときに使う */
export const coreTotal = (scores: Score[]) => totalOf(scores.filter((s) => CORE_SUBJECTS.includes(s.subject)));
