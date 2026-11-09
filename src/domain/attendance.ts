import { weekdayOf, type Availability, type Enrollment, type ExtraAttendee, type Student, type Teacher, type Term } from './types';

const inTerm = (t: Term, date: string) => t.startDate <= date && date <= t.endDate;

/** その日が属する期間。講習を通常期より優先する。 */
export function termForDate(terms: Term[], date: string): Term | null {
  const hits = terms.filter((t) => inTerm(t, date));
  return hits.find((t) => t.kind === 'kosyu') ?? hits[0] ?? null;
}

function override(avail: Availability[], term: Term | null, type: Availability['personType'], id: string, date: string) {
  if (!term) return undefined;
  return avail.find((a) => a.termId === term.id && a.personType === type && a.personId === id && a.date === date)?.available;
}

export function teachersForDate(teachers: Teacher[], date: string, term: Term | null, avail: Availability[]): Teacher[] {
  const wd = weekdayOf(date);
  return teachers.filter((t) => override(avail, term, 'teacher', t.id, date) ?? t.weekdays.includes(wd));
}

export function studentsForDate(
  students: Student[], date: string, term: Term | null,
  enrollments: Enrollment[], avail: Availability[], extras: ExtraAttendee[],
): Student[] {
  const wd = weekdayOf(date);
  const extraIds = new Set(extras.filter((e) => e.date === date).map((e) => e.studentId));
  return students.filter((s) => {
    if (extraIds.has(s.id)) return true;
    const base = term?.kind === 'kosyu'
      ? enrollments.some((e) => e.termId === term.id && e.studentId === s.id)
      : s.regular.some((r) => r.weekday === wd);
    return override(avail, term, 'student', s.id, date) ?? base;
  });
}
