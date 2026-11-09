import { teachersForDate } from './attendance';
import { weekdayOf, type Availability, type Placement, type Teacher, type TemplateSlot, type Term } from './types';

/** 曜日テンプレートから、その日に実際に置く配置を作る（通常期のみ） */
export function templateToPlacements(
  slots: TemplateSlot[], date: string, term: Term | null, teachers: Teacher[], availability: Availability[],
): Omit<Placement, 'id'>[] {
  if (term?.kind !== 'regular') return [];
  const wd = weekdayOf(date);
  const teacherIds = new Set(teachersForDate(teachers, date, term, availability).map((t) => t.id));
  const absent = new Set(
    availability
      .filter((a) => a.termId === term.id && a.personType === 'student' && a.date === date && !a.available)
      .map((a) => a.personId),
  );
  return slots
    .filter((s) => s.weekday === wd && teacherIds.has(s.teacherId) && !absent.has(s.studentId))
    .map(({ periodId, teacherId, studentId, subject }) => ({ date, periodId, teacherId, studentId, subject }));
}
