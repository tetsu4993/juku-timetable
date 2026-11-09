import type { Grade, Placement, Subject, Teacher } from './types';

export const CAPACITY = 4;

const inCell = (p: Placement, date: string, periodId: string) => p.date === date && p.periodId === periodId;

export function isOverCapacity(placements: Placement[], date: string, periodId: string, teacherId: string): boolean {
  return placements.filter((p) => inCell(p, date, periodId) && p.teacherId === teacherId).length > CAPACITY;
}

export function canTeach(teacher: Teacher, grade: Grade, subject: Subject): boolean {
  return teacher.subjects.includes(subject) && teacher.grades.includes(grade);
}

export function isDoubleBooked(
  placements: Placement[], date: string, periodId: string, studentId: string, ignoreId?: string,
): boolean {
  return placements.some((p) => inCell(p, date, periodId) && p.studentId === studentId && p.id !== ignoreId);
}
