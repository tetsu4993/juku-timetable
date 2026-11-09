import { selectableSubjects } from './remaining';
import type { Enrollment, Placement, Student, Subject, Term } from './types';

/**
 * 未配置一覧に出すための「今日まだ配置できる科目」。
 * 講習期：申込の残りがある科目（同じ日に複数コマ可）。
 * 通常期：その曜日の受講科目のうち、今日まだ配置していない科目。
 */
export function subjectsLeftToday(
  student: Student, date: string, term: Term | null, enrollments: Enrollment[], placements: Placement[],
): Subject[] {
  const subjects = selectableSubjects(student, date, term, enrollments, placements);
  if (term?.kind === 'kosyu') return subjects;
  const placedToday = new Set(placements.filter((p) => p.studentId === student.id && p.date === date).map((p) => p.subject));
  return subjects.filter((s) => !placedToday.has(s));
}
