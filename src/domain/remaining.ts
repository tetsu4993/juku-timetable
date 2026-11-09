import { weekdayOf, type Enrollment, type Placement, type Student, type Subject, type Term } from './types';

/** 講習期間内の、科目ごとの残りコマ数（0未満にしない） */
export function remainingBySubject(
  studentId: string, term: Term, enrollments: Enrollment[], placements: Placement[],
): Partial<Record<Subject, number>> {
  const result: Partial<Record<Subject, number>> = {};
  for (const e of enrollments) {
    if (e.termId !== term.id || e.studentId !== studentId) continue;
    const used = placements.filter((p) =>
      p.studentId === studentId && p.subject === e.subject && term.startDate <= p.date && p.date <= term.endDate).length;
    result[e.subject] = Math.max(0, e.count - used);
  }
  return result;
}

export function isFullyPlaced(studentId: string, term: Term, enrollments: Enrollment[], placements: Placement[]): boolean {
  return Object.values(remainingBySubject(studentId, term, enrollments, placements)).every((n) => n === 0);
}

export function selectableSubjects(
  student: Student, date: string, term: Term | null, enrollments: Enrollment[], placements: Placement[],
): Subject[] {
  if (term?.kind === 'kosyu') {
    const rem = remainingBySubject(student.id, term, enrollments, placements);
    return (Object.keys(rem) as Subject[]).filter((s) => (rem[s] ?? 0) > 0);
  }
  const wd = weekdayOf(date);
  const today = student.regular.filter((r) => r.weekday === wd).map((r) => r.subject);
  const pool = today.length > 0 ? today : student.regular.map((r) => r.subject);
  return [...new Set(pool)];
}
